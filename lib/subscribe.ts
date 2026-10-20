import { ID, Permission, Role, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "@/lib/appwrite/db";
import { getQueues } from "@/lib/queue";
import { rateLimit } from "@/lib/rate-limit";
import { countContacts, type ListRow } from "@/lib/contacts";
import { isValidEmail, normalizeEmail, normalizeName, MAX_CONTACTS } from "@/lib/contact-rules";

export type SubscribeResult =
  | { ok: true; status: "pending_confirmation" | "already_subscribed" }
  | { ok: false; code: "invalid_email" | "contact_limit_reached" };

const CONFIRM_COOLDOWN_MS = 10 * 60_000;
const isConflict = (e: unknown) => (e as { code?: number })?.code === 409;

export async function getList(listId: string) {
  const { tablesDB } = createAdminClient();
  try {
    return (await tablesDB.getRow({
      databaseId: DB_ID, tableId: LISTS_TABLE, rowId: listId,
    })) as unknown as ListRow;
  } catch {
    return null;
  }
}

async function queueConfirmation(contactId: string, listId: string) {
  await getQueues().confirm.add(
    "confirm",
    { contactId, listId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

// At most 3 confirmation emails per hour to one address, across the whole platform.
async function emailAllowed(email: string) {
  return (await rateLimit("confirm-email", email, 3, 3600)).ok;
}

export async function subscribeEmail(input: {
  accountId: string;
  listIds: string[]; // already checked: they belong to this account
  email: string;
  name?: string;
  tags?: string[];
  source: "hosted" | "form" | "api";
  sourceUrl?: string;
  keyId?: string;
}): Promise<SubscribeResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, code: "invalid_email" };

  const { tablesDB } = createAdminClient();
  const found = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [Query.equal("accountId", input.accountId), Query.equal("email", email), Query.limit(1)],
  });
  const existing = found.rows[0] as unknown as
    | { $id: string; status: string; listIds: string[] | null; confirmSentAt: string | null }
    | undefined;

  if (existing) {
    if (existing.status === "active") return { ok: true, status: "already_subscribed" };
    if (existing.status !== "pending") return { ok: true, status: "pending_confirmation" }; // blocked: do not reveal

    const last = existing.confirmSentAt ? Date.parse(existing.confirmSentAt) : 0;
    const resend = Date.now() - last > CONFIRM_COOLDOWN_MS && (await emailAllowed(email));
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId: existing.$id,
      data: {
        listIds: [...new Set([...(existing.listIds ?? []), ...input.listIds])],
        ...(resend ? { confirmSentAt: new Date().toISOString() } : {}),
      },
    });
    if (resend) await queueConfirmation(existing.$id, input.listIds[0]);
    return { ok: true, status: "pending_confirmation" };
  }

  if ((await countContacts(input.accountId)) >= MAX_CONTACTS) {
    return { ok: false, code: "contact_limit_reached" };
  }

  const send = await emailAllowed(email);
  try {
    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId: input.accountId,
        email,
        name: normalizeName(input.name ?? ""),
        status: "pending",
        source: input.source,
        tags: input.tags ?? [],
        listIds: input.listIds,
        ...(input.sourceUrl ? { consentUrl: input.sourceUrl.slice(0, 500) } : {}),
        ...(input.keyId ? { consentKeyId: input.keyId } : {}),
        ...(send ? { confirmSentAt: new Date().toISOString() } : {}),
      },
      permissions: [Permission.read(Role.user(input.accountId))],
    });
    if (send) await queueConfirmation(row.$id, input.listIds[0]);
  } catch (e) {
    if (!isConflict(e)) throw e; // two requests at once: the other one won, that is fine
  }
  return { ok: true, status: "pending_confirmation" };
}
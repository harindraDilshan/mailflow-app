import { ID, Permission, Role, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import {
  DB_ID, CONTACTS_TABLE, LISTS_TABLE, MESSAGES_TABLE, CAMPAIGNS_TABLE, AUTOMATIONS_TABLE,
} from "@/lib/appwrite/db";
import {
  normalizeEmail, isValidEmail, normalizeName, normalizeNote, normalizeTags, STATUSES, PAGE_SIZE, PAGE_SIZES,
  type ContactStatus,
} from "@/lib/contact-rules";
import { fireContactTriggers } from "@/lib/automation-trigger";

export type ContactRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  tags: string[];
  listIds: string[];
  consentAt: string | null;
  consentUrl: string | null;
  consentKeyId: string | null;
  confirmSentAt?: string | null;
  note?: string | null;
  $updatedAt?: string;
};

export type ListRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  name: string;
  hostedEnabled?: boolean | null;
  pageTitle?: string | null;
  pageText?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
};

function isConflict(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 409;
}

export async function insertContact(
  accountId: string,
  c: {
    email: string;
    name?: string;
    tags?: string[];
    listIds?: string[];
    source: "manual" | "import";
    consent?: boolean;
    note?: string;
  }
): Promise<"added" | "exists" | "invalid"> {
  const email = normalizeEmail(c.email);
  if (!isValidEmail(email)) return "invalid";

  const tags = normalizeTags(c.tags ?? []);
  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId,
        email,
        name: normalizeName(c.name ?? ""),
        status: "active",
        source: c.source,
        tags,
        listIds: c.listIds ?? [],
        ...(c.consent ? { consentAt: new Date().toISOString() } : {}),
        ...(c.note ? { note: normalizeNote(c.note) } : {}),
      },
      permissions: [Permission.read(Role.user(accountId))],
    });
    await fireContactTriggers(accountId, row.$id, c.listIds ?? [], tags);
    return "added";
  } catch (e) {
    if (isConflict(e)) return "exists";
    throw e;
  }
}

export async function countContacts(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.notEqual("status", "archived"),
      Query.limit(1),
    ],
  });
  return res.total;
}

export async function countContactsInList(accountId: string, listId: string, status?: ContactStatus) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.contains("listIds", listId),
      status ? Query.equal("status", status) : Query.notEqual("status", "archived"),
      Query.limit(1),
    ],
  });
  return res.total;
}

export async function findContactByEmail(accountId: string, email: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.equal("email", normalizeEmail(email)), Query.limit(1)],
  });
  return (res.rows[0] as unknown as ContactRow | undefined) ?? null;
}

export async function getOwnedContact(accountId: string, rowId: string) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId,
    })) as unknown as ContactRow;
    return row.accountId === accountId ? row : null;
  } catch {
    return null;
  }
}

export async function getOwnedList(accountId: string, rowId: string) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: LISTS_TABLE,
      rowId,
    })) as unknown as ListRow;
    return row.accountId === accountId ? row : null;
  } catch {
    return null;
  }
}

export async function listOwnedLists(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.orderAsc("$createdAt"), Query.limit(100)],
  });
  return res.rows as unknown as ListRow[];
}

// Never trust list IDs from the browser. Keep only the ones this account owns.
export async function filterOwnedListIds(accountId: string, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 50);
  if (unique.length === 0) return [];
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.equal("$id", unique), Query.limit(50)],
  });
  return (res.rows as unknown as ListRow[]).map((r) => r.$id);
}

// ---------- US-3.5: search and filter ----------
export type ContactFilters = {
  q?: string;
  status?: string; // empty = every status except "archived"
  listId?: string;
  tag?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  sort?: string;
  page: number;
  pageSize?: number;
};

type SearchFilters = Omit<ContactFilters, "page" | "pageSize" | "sort">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Builds the Appwrite query array for the given filters (without sorting or pagination).
 * Shared by the contacts screen, the CSV export, and deleteAllMatchingContacts,
 * so "what you see" is always "what you export or delete".
 */
export function buildContactSearchQueries(accountId: string, f: SearchFilters): string[] {
  const queries = [Query.equal("accountId", accountId)];
  const q = f.q?.trim();
  if (q) {
    queries.push(Query.or([Query.contains("email", q.toLowerCase()), Query.contains("name", q)]));
  }
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) {
    queries.push(Query.equal("status", f.status));
  } else {
    // Archived contacts are hidden from "All", like they are left out of the contact limit.
    queries.push(Query.notEqual("status", "archived"));
  }
  if (f.listId) queries.push(Query.contains("listIds", f.listId));
  if (f.tag?.trim()) queries.push(Query.contains("tags", f.tag.trim().toLowerCase()));
  if (f.from && DATE_RE.test(f.from)) {
    queries.push(Query.greaterThanEqual("$createdAt", `${f.from}T00:00:00.000Z`));
  }
  if (f.to && DATE_RE.test(f.to)) {
    queries.push(Query.lessThanEqual("$createdAt", `${f.to}T23:59:59.999Z`));
  }
  return queries;
}

function sortQuery(sort?: string) {
  switch (sort) {
    case "oldest":
      return Query.orderAsc("$createdAt");
    case "email_asc":
      return Query.orderAsc("email");
    case "email_desc":
      return Query.orderDesc("email");
    default:
      return Query.orderDesc("$createdAt");
  }
}

export function pageSizeOf(value?: number) {
  return (PAGE_SIZES as readonly number[]).includes(value ?? 0) ? (value as number) : PAGE_SIZE;
}

export async function searchContacts(accountId: string, f: ContactFilters) {
  const size = pageSizeOf(f.pageSize);
  const queries = buildContactSearchQueries(accountId, f);
  queries.push(sortQuery(f.sort), Query.limit(size), Query.offset((f.page - 1) * size));

  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, queries });
  return { rows: res.rows as unknown as ContactRow[], total: res.total };
}

// The numbers on the status tabs. The other filters (search, list, tag, dates) still apply.
export async function countContactsByStatus(accountId: string, f: SearchFilters) {
  const { tablesDB } = createAdminClient();
  const keys = ["all", ...STATUSES] as const;
  const totals = await Promise.all(
    keys.map(async (status) => {
      const queries = buildContactSearchQueries(accountId, { ...f, status: status === "all" ? undefined : status });
      queries.push(Query.limit(1));
      const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, queries });
      return res.total;
    })
  );
  return Object.fromEntries(keys.map((k, i) => [k, totals[i]])) as Record<"all" | ContactStatus, number>;
}

/**
 * Fetches every contact matching the given filters, newest first.
 * Pages with a cursor, so archived contacts (not counted in MAX_CONTACTS) cannot push rows past one page.
 * Used by the CSV export and the "delete all matching" server action.
 */
export async function fetchAllMatchingContacts(accountId: string, f: SearchFilters): Promise<ContactRow[]> {
  const { tablesDB } = createAdminClient();
  const out: ContactRow[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 50; page++) {
    const queries = buildContactSearchQueries(accountId, f);
    queries.push(Query.orderDesc("$createdAt"), Query.limit(500));
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, queries });
    const rows = res.rows as unknown as ContactRow[];
    out.push(...rows);
    if (rows.length < 500) break;
    cursor = rows[rows.length - 1].$id;
  }
  return out;
}

// ---------- Email history of one contact ----------
export type ContactActivityItem = {
  id: string;
  createdAt: string;
  sourceId: string;
  sourceName: string | null;
  sourceType: "campaign" | "automation" | null;
  status: string; // queued | sent | failed | skipped
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

type ActivityMessage = {
  $id: string;
  $createdAt: string;
  campaignId: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

// Returns null if the history cannot be read, so the contact page still works.
export async function getContactActivity(accountId: string, contactId: string) {
  const { tablesDB } = createAdminClient();
  const mine = [Query.equal("accountId", accountId), Query.equal("contactId", contactId)];
  const count = async (extra: string[]) =>
    (await tablesDB.listRows({
      databaseId: DB_ID, tableId: MESSAGES_TABLE, queries: [...mine, ...extra, Query.limit(1)],
    })).total;

  try {
    const [recent, sent, opened, clicked] = await Promise.all([
      tablesDB.listRows({
        databaseId: DB_ID,
        tableId: MESSAGES_TABLE,
        queries: [...mine, Query.orderDesc("$createdAt"), Query.limit(10)],
      }),
      count([Query.equal("status", "sent")]),
      count([Query.isNotNull("openedAt")]),
      count([Query.isNotNull("clickedAt")]),
    ]);
    const messages = recent.rows as unknown as ActivityMessage[];

    // For automation emails, "campaignId" holds the automation ID.
    const ids = [...new Set(messages.map((m) => m.campaignId))];
    const names = new Map<string, { name: string; type: "campaign" | "automation" }>();
    if (ids.length > 0) {
      const byIds = [Query.equal("accountId", accountId), Query.equal("$id", ids), Query.limit(ids.length)];
      const [campaigns, automations] = await Promise.all([
        tablesDB.listRows({ databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, queries: byIds }),
        tablesDB.listRows({ databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, queries: byIds }),
      ]);
      for (const r of campaigns.rows) names.set(r.$id, { name: String(r.name), type: "campaign" });
      for (const r of automations.rows) names.set(r.$id, { name: String(r.name), type: "automation" });
    }

    const items: ContactActivityItem[] = messages.map((m) => ({
      id: m.$id,
      createdAt: m.$createdAt,
      sourceId: m.campaignId,
      sourceName: names.get(m.campaignId)?.name ?? null,
      sourceType: names.get(m.campaignId)?.type ?? null,
      status: m.status,
      sentAt: m.sentAt,
      openedAt: m.openedAt,
      clickedAt: m.clickedAt,
    }));
    return { total: recent.total, sent, opened, clicked, items };
  } catch (e) {
    console.error("Could not load contact activity", e);
    return null;
  }
}

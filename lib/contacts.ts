import { ID, Permission, Role, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "@/lib/appwrite/db";
import {
  normalizeEmail, isValidEmail, normalizeName, normalizeTags, STATUSES, PAGE_SIZE,
} from "@/lib/contact-rules";

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
};

export type ListRow = {
  $id: string;
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
  }
): Promise<"added" | "exists" | "invalid"> {
  const email = normalizeEmail(c.email);
  if (!isValidEmail(email)) return "invalid";

  const { tablesDB } = createAdminClient();
  try {
    await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId,
        email,
        name: normalizeName(c.name ?? ""),
        status: "active",
        source: c.source,
        tags: normalizeTags(c.tags ?? []),
        listIds: c.listIds ?? [],
        ...(c.consent ? { consentAt: new Date().toISOString() } : {}),
      },
      permissions: [Permission.read(Role.user(accountId))],
    });
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
    queries: [Query.equal("accountId", accountId), Query.limit(1)],
  });
  return res.total;
}

export async function countContactsInList(accountId: string, listId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.contains("listIds", listId), Query.limit(1)],
  });
  return res.total;
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
  status?: string;
  listId?: string;
  tag?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function searchContacts(accountId: string, f: ContactFilters) {
  const queries = [Query.equal("accountId", accountId)];

  const q = f.q?.trim();
  if (q) {
    queries.push(
      Query.or([Query.contains("email", q.toLowerCase()), Query.contains("name", q)])
    );
  }
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) {
    queries.push(Query.equal("status", f.status));
  }
  if (f.listId) queries.push(Query.contains("listIds", f.listId));
  if (f.tag?.trim()) queries.push(Query.contains("tags", f.tag.trim().toLowerCase()));
  if (f.from && DATE_RE.test(f.from)) {
    queries.push(Query.greaterThanEqual("$createdAt", `${f.from}T00:00:00.000Z`));
  }
  if (f.to && DATE_RE.test(f.to)) {
    queries.push(Query.lessThanEqual("$createdAt", `${f.to}T23:59:59.999Z`));
  }

  queries.push(
    Query.orderDesc("$createdAt"),
    Query.limit(PAGE_SIZE),
    Query.offset((f.page - 1) * PAGE_SIZE)
  );

  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, queries });
  return { rows: res.rows as unknown as ContactRow[], total: res.total };
}
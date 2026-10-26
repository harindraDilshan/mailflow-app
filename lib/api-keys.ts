import { createHash, randomBytes } from "crypto";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, API_KEYS_TABLE } from "@/lib/appwrite/db";

export type ApiKeyRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  name: string;
  type: "public" | "secret";
  keyHash: string;
  prefix: string;
  publicKey: string | null;
  listId: string | null;
  allowedOrigins: string[];
  status: string;
  lastUsedAt: string | null;
};

// Server (secret) keys. Website form keys are one per list, so the number of lists limits them.
export const MAX_KEYS = 10;

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

function generateKey(type: "public" | "secret") {
  const key = `${type === "public" ? "pk" : "sk"}_live_${randomBytes(24).toString("base64url")}`;
  return { key, hash: hashKey(key), prefix: key.slice(0, 14) };
}

// Kept here for older imports. The rule lives in lib/forms.ts, which the browser can use too.
export { normalizeOrigin } from "@/lib/forms";

export async function createApiKey(
  accountId: string,
  input: { name: string; type: "public" | "secret"; listId?: string; origins?: string[] }
) {
  const { key, hash, prefix } = generateKey(input.type);
  const { tablesDB } = createAdminClient();
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: API_KEYS_TABLE,
    rowId: ID.unique(),
    data: {
      accountId,
      name: input.name,
      type: input.type,
      keyHash: hash,
      prefix,
      status: "active",
      ...(input.type === "public"
        ? { publicKey: key, listId: input.listId, allowedOrigins: input.origins ?? [] }
        : {}),
    },
  });
  return key; // the only time a secret key is visible
}

export async function listApiKeys(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: API_KEYS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.rows as unknown as ApiKeyRow[];
}

export async function countActiveKeys(accountId: string, type?: "public" | "secret") {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: API_KEYS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.equal("status", "active"),
      ...(type ? [Query.equal("type", type)] : []),
      Query.limit(1),
    ],
  });
  return res.total;
}

// The websites that may use a form key. Returns false if the key is not this account's.
export async function updateKeyOrigins(accountId: string, id: string, origins: string[]) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({ databaseId: DB_ID, tableId: API_KEYS_TABLE, rowId: id })) as unknown as ApiKeyRow;
    if (row.accountId !== accountId || row.type !== "public" || row.status !== "active") return false;
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: API_KEYS_TABLE, rowId: id, data: { allowedOrigins: origins } });
    return true;
  } catch {
    return false;
  }
}

export async function revokeApiKey(accountId: string, id: string) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: API_KEYS_TABLE, rowId: id,
    })) as unknown as ApiKeyRow;
    if (row.accountId !== accountId) return;
    await tablesDB.updateRow({
      databaseId: DB_ID, tableId: API_KEYS_TABLE, rowId: id, data: { status: "revoked" },
    });
  } catch {}
}

export async function findKeyByPlain(plain: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: API_KEYS_TABLE,
    queries: [Query.equal("keyHash", hashKey(plain)), Query.limit(1)],
  });
  const row = res.rows[0] as unknown as ApiKeyRow | undefined;
  return row && row.status === "active" ? row : null;
}

export async function findPublicKeyForList(accountId: string, listId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: API_KEYS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.equal("listId", listId),
      Query.equal("type", "public"),
      Query.equal("status", "active"),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ],
  });
  return (res.rows[0] as unknown as ApiKeyRow | undefined) ?? null;
}

// Save "last used" at most once a minute, to avoid a database write on every request.
export async function touchKey(key: ApiKeyRow) {
  if (key.lastUsedAt && Date.now() - Date.parse(key.lastUsedAt) < 60_000) return;
  const { tablesDB } = createAdminClient();
  await tablesDB
    .updateRow({
      databaseId: DB_ID, tableId: API_KEYS_TABLE, rowId: key.$id,
      data: { lastUsedAt: new Date().toISOString() },
    })
    .catch(() => {});
}
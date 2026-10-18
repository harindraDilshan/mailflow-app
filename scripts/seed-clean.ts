import { Query } from "node-appwrite";
import { createAdminClient } from "../lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "../lib/appwrite/db";

async function main() {
  const accountId = process.argv[2];
  if (!accountId) {
    console.error("Usage: npm run seed:clean -- <accountId>");
    process.exit(1);
  }
  const { tablesDB } = createAdminClient();

  let contacts = 0;
  while (true) {
    const res = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      queries: [Query.equal("accountId", accountId), Query.contains("tags", "loadtest"), Query.limit(100)],
    });
    if (res.rows.length === 0) break;
    await tablesDB.deleteRows({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      queries: [Query.equal("$id", res.rows.map((r) => r.$id))],
    });
    contacts += res.rows.length;
    console.log(`Deleted ${contacts} contacts...`);
  }

  const lists = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.limit(100)],
  });
  let removedLists = 0;
  for (const l of lists.rows as unknown as { $id: string; name: string }[]) {
    if (l.name.startsWith("Load test")) {
      await tablesDB.deleteRow({ databaseId: DB_ID, tableId: LISTS_TABLE, rowId: l.$id });
      removedLists++;
    }
  }
  console.log(`Done. Deleted ${contacts} contacts and ${removedLists} lists.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
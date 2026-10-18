import { ID } from "node-appwrite";
import { createAdminClient } from "../lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "../lib/appwrite/db";

async function main() {
  const [accountId, countArg] = process.argv.slice(2);
  const count = Number(countArg ?? 1000);
  if (!accountId) {
    console.error("Usage: npm run seed -- <accountId> [count]");
    process.exit(1);
  }

  const { tablesDB } = createAdminClient();
  const list = await tablesDB.createRow({
    databaseId: DB_ID, tableId: LISTS_TABLE, rowId: ID.unique(),
    data: { accountId, name: `Load test ${count}` },
  });

  let expected = 0;
  for (let start = 1; start <= count; start += 100) {
    const rows = [];
    for (let i = start; i < start + 100 && i <= count; i++) {
      const status = i % 50 === 0 ? "unsubscribed" : i % 97 === 0 ? "bounced" : "active";
      if (status === "active") expected++;
      rows.push({
        $id: ID.unique(),
        accountId,
        email: `user${String(i).padStart(5, "0")}@example.test`,
        name: `User ${i}`,
        status,
        source: "import",
        tags: ["loadtest"],
        listIds: [list.$id],
      });
    }
    await tablesDB.createRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rows });
    console.log(`Created ${Math.min(start + 99, count)} / ${count}`);
  }
  console.log(`Done. A campaign to this list should send exactly ${expected} emails.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
import { Client, TablesDB, TablesDBIndexType } from "node-appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID!;
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);
const db = new TablesDB(client);

type Col =
  | { key: string; type: "varchar"; size: number; required?: boolean; default?: string; array?: boolean }
  | { key: string; type: "text"; required?: boolean }
  | { key: string; type: "mediumtext"; required?: boolean } // up to 16 MB
  | { key: string; type: "int"; required?: boolean; default?: number }
  | { key: string; type: "bool"; required?: boolean; default?: boolean }
  | { key: string; type: "datetime"; required?: boolean };
type Idx = { key: string; type: "key" | "unique"; columns: string[] };
type Spec = { id: string; name: string; columns: Col[]; indexes: Idx[] };

const specs: Spec[] = [
  {
    id: "lists",
    name: "lists",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "name", type: "varchar", size: 100, required: true },
      { key: "hostedEnabled", type: "bool", default: false },
      { key: "pageTitle", type: "varchar", size: 120 },
      { key: "pageText", type: "varchar", size: 500 },
      { key: "fromName", type: "varchar", size: 100 },
      { key: "fromEmail", type: "varchar", size: 254 },
      // The design of the sign-up form (lib/forms.ts). Empty = the default.
      { key: "formButton", type: "varchar", size: 40 },
      { key: "formNameField", type: "varchar", size: 10 }, // off | optional | required
      { key: "formSuccess", type: "varchar", size: 300 },
      { key: "formColor", type: "varchar", size: 7 }, // #rrggbb
    ],
    indexes: [{ key: "idx_account", type: "key", columns: ["accountId"] }],
  },
  {
    id: "contacts",
    name: "contacts",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "email", type: "varchar", size: 254, required: true },
      { key: "name", type: "varchar", size: 200 },
      { key: "status", type: "varchar", size: 20, default: "active" },
      { key: "source", type: "varchar", size: 20, default: "manual" },
      { key: "tags", type: "varchar", size: 50, array: true },
      { key: "listIds", type: "varchar", size: 36, array: true },
      { key: "consentAt", type: "datetime" },
      { key: "consentUrl", type: "varchar", size: 500 },
      { key: "consentKeyId", type: "varchar", size: 36 },
      { key: "confirmSentAt", type: "datetime" },
      { key: "note", type: "text" },
    ],
    indexes: [
      { key: "uniq_account_email", type: "unique", columns: ["accountId", "email"] },
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_status", type: "key", columns: ["status"] },
      { key: "idx_email", type: "key", columns: ["email"] },
      { key: "idx_name", type: "key", columns: ["name"] },
    ],
  },
  {
    id: "campaigns",
    name: "campaigns",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "name", type: "varchar", size: 150, required: true },
      { key: "subject", type: "varchar", size: 200, required: true },
      { key: "previewText", type: "varchar", size: 200 },
      { key: "fromName", type: "varchar", size: 100 },
      { key: "fromEmail", type: "varchar", size: 254, required: true },
      { key: "replyTo", type: "varchar", size: 254 },
      { key: "html", type: "text", required: true },
      { key: "design", type: "mediumtext" }, // JSON block design of the visual editor (lib/email-design.ts)
      { key: "listIds", type: "varchar", size: 36, array: true },
      { key: "status", type: "varchar", size: 20, default: "draft" },
      { key: "scheduledAt", type: "datetime" },
      { key: "startedAt", type: "datetime" },
      { key: "finishedAt", type: "datetime" },
    ],
    indexes: [
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_status", type: "key", columns: ["status"] },
      { key: "idx_account_status", type: "key", columns: ["accountId", "status"] }, // campaigns screen tabs
    ],
  },
  {
    id: "messages",
    name: "messages",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "campaignId", type: "varchar", size: 36, required: true },
      { key: "contactId", type: "varchar", size: 36, required: true },
      { key: "email", type: "varchar", size: 254, required: true },
      { key: "name", type: "varchar", size: 200 },
      { key: "status", type: "varchar", size: 20, default: "queued" },
      { key: "error", type: "varchar", size: 500 },
      { key: "providerMessageId", type: "varchar", size: 200 },
      { key: "sentAt", type: "datetime" },
      { key: "attempts", type: "int", default: 0 },
      { key: "openedAt", type: "datetime" },
      { key: "clickedAt", type: "datetime" },
      { key: "stepIndex", type: "int" },
    ],
    indexes: [
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_campaign", type: "key", columns: ["campaignId"] },
      { key: "idx_campaign_status", type: "key", columns: ["campaignId", "status"] },
      { key: "idx_opened", type: "key", columns: ["openedAt"] },
      { key: "idx_clicked", type: "key", columns: ["clickedAt"] },
      { key: "idx_campaign_step", type: "key", columns: ["campaignId", "stepIndex"] },
      { key: "idx_account_contact", type: "key", columns: ["accountId", "contactId"] }, // contact email history
    ],
  },
  {
    id: "events",
    name: "events",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "campaignId", type: "varchar", size: 36, required: true },
      { key: "messageId", type: "varchar", size: 36, required: true },
      { key: "contactId", type: "varchar", size: 36, required: true },
      { key: "type", type: "varchar", size: 20, required: true }, // open click delivered bounce complaint unsubscribe
      { key: "url", type: "text" },
      { key: "urlHash", type: "varchar", size: 16 },
      { key: "userAgent", type: "varchar", size: 300 },
    ],
    indexes: [
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_message", type: "key", columns: ["messageId"] },
      { key: "idx_campaign_type", type: "key", columns: ["campaignId", "type"] },
      { key: "idx_campaign_type_url", type: "key", columns: ["campaignId", "type", "urlHash"] },
    ],
  },
  {
    id: "api_keys",
    name: "api_keys",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "name", type: "varchar", size: 100, required: true },
      { key: "type", type: "varchar", size: 10, required: true }, // public | secret
      { key: "keyHash", type: "varchar", size: 64, required: true },
      { key: "prefix", type: "varchar", size: 24, required: true },
      { key: "publicKey", type: "varchar", size: 80 }, // only for public keys
      { key: "listId", type: "varchar", size: 36 }, // public keys belong to one list
      { key: "allowedOrigins", type: "varchar", size: 253, array: true },
      { key: "status", type: "varchar", size: 10, default: "active" },
      { key: "lastUsedAt", type: "datetime" },
    ],
    indexes: [
      { key: "uniq_hash", type: "unique", columns: ["keyHash"] },
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_account_list", type: "key", columns: ["accountId", "listId"] },
    ],
  },
    {
    id: "domains",
    name: "domains",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "domain", type: "varchar", size: 253, required: true },
      { key: "status", type: "varchar", size: 20, default: "pending" },
      { key: "dkimStatus", type: "varchar", size: 30, default: "PENDING" },
      { key: "dkimTokens", type: "varchar", size: 500, required: true },
      { key: "mailFromDomain", type: "varchar", size: 253 },
      { key: "spfOk", type: "bool", default: false },
      { key: "dmarcOk", type: "bool", default: false },
      { key: "lastCheckedAt", type: "datetime" },
      { key: "verifiedAt", type: "datetime" },
    ],
    indexes: [
      { key: "uniq_domain", type: "unique", columns: ["domain"] },
      { key: "idx_account", type: "key", columns: ["accountId"] },
    ],
  },
    {
    id: "automations",
    name: "automations",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "name", type: "varchar", size: 150, required: true },
      { key: "status", type: "varchar", size: 10, default: "draft" }, // draft | active | paused
      { key: "triggerType", type: "varchar", size: 20, required: true }, // list_joined | tag_added
      { key: "triggerValue", type: "varchar", size: 100, required: true }, // list ID or tag
      { key: "fromName", type: "varchar", size: 100 },
      { key: "fromEmail", type: "varchar", size: 254, required: true },
      { key: "steps", type: "text", required: true }, // JSON list of steps (old automations)
      { key: "flow", type: "mediumtext" }, // JSON workflow graph (lib/automation-flow.ts)
    ],
    indexes: [
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_status", type: "key", columns: ["status"] },
      { key: "idx_trigger", type: "key", columns: ["accountId", "status", "triggerType", "triggerValue"] },
    ],
  },
  {
    id: "templates",
    name: "templates",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "name", type: "varchar", size: 150, required: true },
      { key: "source", type: "varchar", size: 10, default: "design" }, // design | html
      { key: "design", type: "mediumtext" }, // JSON block design (lib/email-design.ts), only for "design"
      { key: "html", type: "mediumtext", required: true }, // ready to send
    ],
    indexes: [{ key: "idx_account", type: "key", columns: ["accountId"] }],
  },
  {
    id: "automation_runs",
    name: "automation_runs",
    columns: [
      { key: "accountId", type: "varchar", size: 36, required: true },
      { key: "automationId", type: "varchar", size: 36, required: true },
      { key: "contactId", type: "varchar", size: 36, required: true },
      { key: "email", type: "varchar", size: 254 },
      { key: "status", type: "varchar", size: 12, default: "active" }, // active | completed | exited
      { key: "stepIndex", type: "int", default: 0 },
      { key: "nextRunAt", type: "datetime" },
      { key: "completedAt", type: "datetime" },
      { key: "exitReason", type: "varchar", size: 60 },
    ],
    indexes: [
      { key: "idx_account", type: "key", columns: ["accountId"] },
      { key: "idx_auto_status", type: "key", columns: ["automationId", "status"] },
      { key: "idx_auto_status_next", type: "key", columns: ["automationId", "status", "nextRunAt"] },
    ],
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function addColumn(tableId: string, c: Col) {
  const base = { databaseId, tableId, key: c.key, required: c.required ?? false };
  switch (c.type) {
    case "varchar":
      return db.createVarcharColumn({ ...base, size: c.size, xdefault: c.default, array: c.array });
    case "text":
      return db.createTextColumn(base);
    case "mediumtext":
      return db.createMediumtextColumn(base);
    case "int":
      return db.createIntegerColumn({ ...base, xdefault: c.default });
    case "bool":
      return db.createBooleanColumn({ ...base, xdefault: c.default });
    case "datetime":
      return db.createDatetimeColumn(base);
  }
}

type Status = { key: string; status: string };

async function waitUntilReady(tableId: string, what: "columns" | "indexes") {
  for (let i = 0; i < 90; i++) {
    const res = what === "columns"
      ? await db.listColumns({ databaseId, tableId })
      : await db.listIndexes({ databaseId, tableId });
    const items = (what === "columns"
      ? (res as unknown as { columns: Status[] }).columns
      : (res as unknown as { indexes: Status[] }).indexes);
    const failed = items.find((x) => x.status === "failed");
    if (failed) throw new Error(`${what} "${failed.key}" failed on table ${tableId}`);
    if (items.every((x) => x.status === "available")) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${what} on ${tableId}`);
}

async function tableExists(id: string) {
  try {
    await db.getTable({ databaseId, tableId: id });
    return true;
  } catch {
    return false;
  }
}

async function existingKeys(tableId: string) {
  const cols = (await db.listColumns({ databaseId, tableId })) as unknown as { columns: { key: string }[] };
  const idx = (await db.listIndexes({ databaseId, tableId })) as unknown as { indexes: { key: string }[] };
  return {
    columns: new Set(cols.columns.map((c) => c.key)),
    indexes: new Set(idx.indexes.map((i) => i.key)),
  };
}

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("RESET: deleting tables and ALL their data in 5 seconds. Press Ctrl+C to cancel.");
    await sleep(5000);
    for (const s of specs) {
      if (await tableExists(s.id)) {
        await db.deleteTable({ databaseId, tableId: s.id });
        console.log(`Deleted ${s.id}`);
      }
    }
    await sleep(2000);
  }

  for (const s of specs) {
    const exists = await tableExists(s.id);
    if (!exists) {
      console.log(`Creating ${s.id}...`);
      await db.createTable({ databaseId, tableId: s.id, name: s.name, rowSecurity: true });
    }

    const have = exists
      ? await existingKeys(s.id)
      : { columns: new Set<string>(), indexes: new Set<string>() };

    const newCols = s.columns.filter((c) => !have.columns.has(c.key));
    for (const c of newCols) await addColumn(s.id, c);
    if (newCols.length) await waitUntilReady(s.id, "columns");

    const newIdx = s.indexes.filter((i) => !have.indexes.has(i.key));
    for (const i of newIdx) {
      await db.createIndex({
        databaseId,
        tableId: s.id,
        key: i.key,
        type: i.type === "unique" ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
        columns: i.columns,
      });
    }
    if (newIdx.length) await waitUntilReady(s.id, "indexes");

    console.log(`${s.id}: ${newCols.length} new columns, ${newIdx.length} new indexes`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

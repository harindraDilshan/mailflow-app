import { createHash } from "crypto";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, MESSAGES_TABLE, EVENTS_TABLE, CONTACTS_TABLE } from "@/lib/appwrite/db";
import type { MessageRow } from "@/lib/campaigns";
import { hashUrl } from "@/lib/tracking-token";

const isConflict = (e: unknown) => (e as { code?: number })?.code === 409;
const fixedId = (messageId: string, type: string) =>
  createHash("sha1").update(`${messageId}:${type}`).digest("hex").slice(0, 32);

async function getMessage(id: string) {
  const { tablesDB } = createAdminClient();
  try {
    return (await tablesDB.getRow({
      databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: id,
    })) as unknown as MessageRow;
  } catch {
    return null;
  }
}

// Returns false if an event with this ID already exists.
async function createEvent(
  msg: MessageRow,
  type: string,
  opts: { id?: string; url?: string; userAgent?: string } = {}
) {
  const { tablesDB } = createAdminClient();
  try {
    await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: EVENTS_TABLE,
      rowId: opts.id ?? ID.unique(),
      data: {
        accountId: msg.accountId,
        campaignId: msg.campaignId,
        messageId: msg.$id,
        contactId: msg.contactId,
        type,
        ...(opts.url ? { url: opts.url, urlHash: hashUrl(opts.url) } : {}),
        ...(opts.userAgent ? { userAgent: opts.userAgent.slice(0, 300) } : {}),
      },
    });
    return true;
  } catch (e) {
    if (isConflict(e)) return false;
    throw e;
  }
}

// First open / first click are saved on the message, for the "unique" numbers.
async function touchMessage(msg: MessageRow, what: { open?: boolean; click?: boolean }) {
  const now = new Date().toISOString();
  const data: Record<string, string> = {};
  if (what.open && !msg.openedAt) data.openedAt = now;
  if (what.click && !msg.clickedAt) data.clickedAt = now;
  if (Object.keys(data).length === 0) return;

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: msg.$id, data });
}

export async function recordOpen(messageId: string, userAgent?: string) {
  const msg = await getMessage(messageId);
  if (!msg) return;
  await createEvent(msg, "open", { userAgent });
  await touchMessage(msg, { open: true });
}

export async function recordClick(messageId: string, url: string, userAgent?: string) {
  const msg = await getMessage(messageId);
  if (!msg) return;
  await createEvent(msg, "click", { url, userAgent });
  await touchMessage(msg, { open: true, click: true }); // a click also counts as an open
}

async function markContact(contactId: string, status: "bounced" | "complained") {
  const { tablesDB } = createAdminClient();
  try {
    const contact = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId,
    })) as unknown as { status: string };
    if (status === "bounced" && contact.status !== "active") return;
    if (status === "complained" && contact.status === "complained") return;
    await tablesDB.updateRow({
      databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId, data: { status },
    });
  } catch (e) {
    console.error("Could not update contact status", e);
  }
}

// Delivered, bounce, complaint, unsubscribe: recorded once per message.
// The SES webhook will call this same function later.
export async function recordOnce(
  messageId: string,
  type: "delivered" | "bounce" | "complaint" | "unsubscribe"
) {
  const msg = await getMessage(messageId);
  if (!msg) return false;

  const created = await createEvent(msg, type, { id: fixedId(messageId, type) });
  if (!created) return false; // already recorded

  if (type === "bounce") await markContact(msg.contactId, "bounced");
  if (type === "complaint") await markContact(msg.contactId, "complained");
  return true;
}
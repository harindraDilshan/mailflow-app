import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE } from "@/lib/appwrite/db";
import { recordOnce } from "@/lib/events";

type ContactInfo = { $id: string; email: string; status: string };

export async function getContactForUnsubscribe(contactId: string): Promise<ContactInfo | null> {
  const { tablesDB } = createAdminClient();
  try {
    return (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      rowId: contactId,
    })) as unknown as ContactInfo;
  } catch {
    return null;
  }
}

// Only "active" contacts change. Bounced and complained stay as they are.
export async function unsubscribeContact(contactId: string, messageId?: string) {
  const contact = await getContactForUnsubscribe(contactId);
  if (!contact) return false;

  if (contact.status === "active") {
    const { tablesDB } = createAdminClient();
    await tablesDB.updateRow({
      databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId, data: { status: "unsubscribed" },
    });
    if (messageId) await recordOnce(messageId, "unsubscribe").catch(() => {});
  }
  return true;
}
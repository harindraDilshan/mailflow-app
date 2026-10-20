"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE } from "@/lib/appwrite/db";
import { verifyConfirm } from "@/lib/confirm-token";

export async function confirmSubscription(formData: FormData): Promise<void> {
  const contactId = verifyConfirm(String(formData.get("t") ?? ""));
  if (!contactId) redirect("/confirm");

  const { tablesDB } = createAdminClient();
  try {
    const contact = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId,
    })) as unknown as { status: string };

    // Only "pending" can become "active". Blocked people stay blocked.
    if (contact.status === "pending") {
      await tablesDB.updateRow({
        databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId,
        data: { status: "active", consentAt: new Date().toISOString() },
      });
    }
  } catch {
    redirect("/confirm");
  }
  redirect("/confirm/done");
}
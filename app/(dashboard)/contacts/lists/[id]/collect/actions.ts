"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, LISTS_TABLE } from "@/lib/appwrite/db";
import { getOwnedList } from "@/lib/contacts";
import { senderDomainIssue } from "@/lib/campaigns";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";

type State = { error?: string; message?: string } | undefined;

export async function saveSubscribeSettings(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("id") ?? ""));
  if (!list) return { error: "List not found." };

  const hostedEnabled = formData.get("hostedEnabled") === "on";
  const fromEmail = normalizeEmail(String(formData.get("fromEmail") ?? ""));

  if (fromEmail && !isValidEmail(fromEmail)) return { error: "Enter a valid sender email." };
  if (hostedEnabled && !fromEmail) return { error: "Set a sender email before turning on the page." };
  if (fromEmail) {
    const issue = await senderDomainIssue(user.$id, fromEmail);
    if (issue) return { error: issue };
  }

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    rowId: list.$id,
    data: {
      hostedEnabled,
      pageTitle: normalizeName(String(formData.get("pageTitle") ?? "")).slice(0, 120),
      pageText: String(formData.get("pageText") ?? "").trim().slice(0, 500),
      fromName: normalizeName(String(formData.get("fromName") ?? "")).slice(0, 100),
      fromEmail,
    },
  });

  revalidatePath(`/contacts/lists/${list.$id}/collect`);
  return { message: "Saved." };
}
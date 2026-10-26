"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, LISTS_TABLE } from "@/lib/appwrite/db";
import { getOwnedList } from "@/lib/contacts";
import { senderDomainIssue } from "@/lib/campaigns";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";
import { cleanDesign, parseOrigins } from "@/lib/forms";
import { createApiKey, findPublicKeyForList, updateKeyOrigins } from "@/lib/api-keys";

export type FormState = { error?: string; message?: string } | undefined;
export type Result = { ok: boolean; message: string };

// The design columns come from `npm run db:setup`. Show how to fix it, instead of crashing the page.
const SETUP_NEEDED = 'The database is missing the new form fields. Run "npm run db:setup", then try again.';
const missingColumn = (e: unknown) => /Unknown attribute/i.test((e as { message?: string })?.message ?? "");

async function ownedList(formData: FormData) {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("listId") ?? ""));
  return { user, list };
}

async function updateList(id: string, data: Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: LISTS_TABLE, rowId: id, data });
}

function refresh(listId: string) {
  revalidatePath(`/contacts/lists/${listId}/collect`);
  revalidatePath("/contacts/lists");
  revalidatePath("/contacts/forms");
}

// ---------- 1. who the confirmation email comes from (needed by every sign-up method) ----------
export async function saveSender(_: FormState, formData: FormData): Promise<FormState> {
  const { user, list } = await ownedList(formData);
  if (!list) return { error: "List not found." };

  const fromEmail = normalizeEmail(String(formData.get("fromEmail") ?? ""));
  if (!isValidEmail(fromEmail)) return { error: "Enter a valid sender email." };
  const issue = await senderDomainIssue(user.$id, fromEmail);
  if (issue) return { error: issue };

  await updateList(list.$id, {
    fromName: normalizeName(String(formData.get("fromName") ?? "")).slice(0, 100),
    fromEmail,
  });
  refresh(list.$id);
  return { message: "Confirmation email sender saved." };
}

// ---------- 2. the design of the form ----------
export async function saveDesign(_: FormState, formData: FormData): Promise<FormState> {
  const { list } = await ownedList(formData);
  if (!list) return { error: "List not found." };
  try {
    await updateList(list.$id, cleanDesign((name) => String(formData.get(name) ?? "")));
  } catch (e) {
    if (missingColumn(e)) return { error: SETUP_NEEDED };
    throw e;
  }
  refresh(list.$id);
  return { message: "Form design saved. The hosted page and the embed code use it now." };
}

// ---------- 3. the hosted page ----------
export async function setHostedPage(formData: FormData): Promise<Result> {
  const { list } = await ownedList(formData);
  if (!list) return { ok: false, message: "List not found." };
  const on = formData.get("on") === "true";
  if (on && !list.fromEmail) return { ok: false, message: "Set the confirmation email sender first." };

  await updateList(list.$id, { hostedEnabled: on });
  refresh(list.$id);
  return { ok: true, message: on ? "Your sign-up page is live." : "Your sign-up page is off. The link shows “not found” now." };
}

// ---------- 4. the embed code: one website form key per list ----------
export async function setupWebsiteForm(_: FormState, formData: FormData): Promise<FormState> {
  const { user, list } = await ownedList(formData);
  if (!list) return { error: "List not found." };
  if (!list.fromEmail) return { error: "Set the confirmation email sender first." };

  const parsed = parseOrigins(String(formData.get("origins") ?? ""));
  if (!parsed.origins) return { error: parsed.error };

  // An existing key keeps working on the websites that already use it: only its website list changes.
  const existing = await findPublicKeyForList(user.$id, list.$id);
  if (existing) {
    if (!(await updateKeyOrigins(user.$id, existing.$id, parsed.origins))) return { error: "The website list could not be saved." };
  } else {
    await createApiKey(user.$id, {
      name: `Website form: ${list.name}`.slice(0, 100),
      type: "public",
      listId: list.$id,
      origins: parsed.origins,
    });
  }

  refresh(list.$id);
  revalidatePath("/developers");
  return {
    message: existing
      ? "Websites saved."
      : "Your embed code is ready. Copy it into your website.",
  };
}

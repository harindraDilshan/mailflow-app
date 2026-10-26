"use server";

import { ID, Permission, Role } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, AUTOMATIONS_TABLE } from "@/lib/appwrite/db";
import { getOwnedList } from "@/lib/contacts";
import { isValidEmail, normalizeEmail, normalizeName, normalizeTags } from "@/lib/contact-rules";
import { lastSender } from "@/lib/campaigns";
import { MAX_AUTOMATIONS } from "@/lib/automation-rules";
import { flowOf, parseFlow, triggerOf } from "@/lib/automation-flow";
import { recipeFlow } from "@/lib/automation-templates";
import { countAutomations, getOwnedAutomation } from "@/lib/automations";
import { reviewAutomation } from "@/lib/automation-review";

export type CreateState = { error?: string; id?: string } | undefined;
// The other actions return this, so the screen can show a toast and stay where it is.
export type ActionResult = { ok: boolean; message: string; id?: string };

const notFound: ActionResult = { ok: false, message: "Automation not found." };

// The "flow" column comes from `npm run db:setup`. Tell the user how to fix it, instead of crashing the page.
const SETUP_NEEDED = 'The database is missing the new automation fields. Run "npm run db:setup", then try again.';
const missingColumn = (e: unknown) => /Unknown attribute/i.test((e as { message?: string })?.message ?? "");

function revalidateAutomations() {
  revalidatePath("/automations", "layout");
}

// ---------- create from a recipe ----------
export async function createAutomation(_: CreateState, formData: FormData): Promise<CreateState> {
  const user = await requireUser();

  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 150);
  if (!name) return { error: "Give the automation a name." };
  if ((await countAutomations(user.$id)) >= MAX_AUTOMATIONS) {
    return { error: `You can have up to ${MAX_AUTOMATIONS} automations. Delete one first.` };
  }

  const triggerType = formData.get("triggerType") === "tag_added" ? "tag_added" : "list_joined";
  let triggerValue = String(formData.get("triggerValue") ?? "").trim();
  if (triggerType === "list_joined") {
    const list = await getOwnedList(user.$id, triggerValue);
    if (!list) return { error: "Choose the list that starts this automation." };
    triggerValue = list.$id;
  } else {
    triggerValue = normalizeTags(triggerValue)[0] ?? "";
    if (!triggerValue) return { error: "Enter the tag that starts this automation." };
  }

  const flow = recipeFlow(String(formData.get("recipe") ?? "blank"), { triggerType, triggerValue, exitOnLeave: true });
  // The sender of the last campaign: most people always send from the same address.
  const sender = await lastSender(user.$id);

  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: AUTOMATIONS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId: user.$id,
        name,
        status: "draft",
        triggerType,
        triggerValue,
        fromName: sender.fromName,
        fromEmail: sender.fromEmail || user.email,
        steps: "[]",
        flow: JSON.stringify(flow),
      },
      permissions: [Permission.read(Role.user(user.$id))],
    });
    revalidateAutomations();
    return { id: row.$id };
  } catch (e) {
    if (missingColumn(e)) return { error: SETUP_NEEDED };
    throw e;
  }
}

// ---------- save the builder ----------
export async function saveAutomation(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, String(formData.get("id") ?? ""));
  if (!a) return notFound;
  if (a.status === "active") return { ok: false, message: "Pause the automation before you change it." };

  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 150);
  if (!name) return { ok: false, message: "Give the automation a name." };
  const fromName = normalizeName(String(formData.get("fromName") ?? "")).slice(0, 100);
  const fromEmail = normalizeEmail(String(formData.get("fromEmail") ?? ""));
  if (!isValidEmail(fromEmail)) return { ok: false, message: "Enter a valid sender email in the automation settings." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("flow") ?? ""));
  } catch {
    return { ok: false, message: "The workflow could not be read." };
  }
  const parsed = parseFlow(raw);
  if (!parsed.flow) return { ok: false, message: parsed.error };

  // Never trust a list ID from the browser.
  const trigger = triggerOf(parsed.flow).data;
  if (trigger.triggerType === "list_joined" && trigger.triggerValue && !(await getOwnedList(user.$id, trigger.triggerValue))) {
    return { ok: false, message: "The list of the trigger was not found." };
  }

  const { tablesDB } = createAdminClient();
  try {
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: AUTOMATIONS_TABLE,
      rowId: a.$id,
      data: {
        name,
        fromName,
        fromEmail,
        // The trigger is kept in its own columns too: the worker finds automations by them.
        triggerType: trigger.triggerType,
        triggerValue: trigger.triggerValue,
        flow: JSON.stringify(parsed.flow),
      },
    });
  } catch (e) {
    if (missingColumn(e)) return { ok: false, message: SETUP_NEEDED };
    throw e;
  }

  revalidateAutomations();
  return { ok: true, message: "Automation saved." };
}

// ---------- turn on, pause ----------
export async function setAutomationStatus(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, String(formData.get("id") ?? ""));
  if (!a) return notFound;

  const to = formData.get("to") === "active" ? "active" : "paused";
  if (to === "active") {
    if (!user.emailVerification) return { ok: false, message: "Verify your account email before you turn on automations." };
    const { issues } = await reviewAutomation(user.$id, a);
    if (issues.length > 0) {
      const more = issues.length > 1 ? ` (and ${issues.length - 1} more)` : "";
      return { ok: false, message: `${issues[0].message}${more}` };
    }
  }

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, rowId: a.$id, data: { status: to } });
  revalidateAutomations();
  return {
    ok: true,
    message:
      to === "active"
        ? "The automation is on. People who match the trigger from now on enter it."
        : "The automation is paused. Nobody moves forward until you turn it on again.",
  };
}

// ---------- duplicate, delete ----------
export async function duplicateAutomation(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, String(formData.get("id") ?? ""));
  if (!a) return notFound;
  if ((await countAutomations(user.$id)) >= MAX_AUTOMATIONS) {
    return { ok: false, message: `You can have up to ${MAX_AUTOMATIONS} automations. Delete one first.` };
  }

  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: AUTOMATIONS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId: user.$id,
        name: `${a.name} (copy)`.slice(0, 150),
        status: "draft",
        triggerType: a.triggerType,
        triggerValue: a.triggerValue,
        fromName: a.fromName ?? "",
        fromEmail: a.fromEmail,
        steps: "[]",
        flow: JSON.stringify(flowOf(a)),
      },
      permissions: [Permission.read(Role.user(user.$id))],
    });
    revalidateAutomations();
    return { ok: true, message: "Automation duplicated. The copy is a draft.", id: row.$id };
  } catch (e) {
    if (missingColumn(e)) return { ok: false, message: SETUP_NEEDED };
    throw e;
  }
}

export async function deleteAutomation(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, String(formData.get("id") ?? ""));
  if (!a) return notFound;

  // People still in it leave at their next step (the worker sees that the automation is gone).
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, rowId: a.$id });
  revalidateAutomations();
  return { ok: true, message: `Automation "${a.name}" deleted.` };
}

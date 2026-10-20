"use server";

import { ID, Permission, Role } from "node-appwrite";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, AUTOMATIONS_TABLE } from "@/lib/appwrite/db";
import { getOwnedList } from "@/lib/contacts";
import { isValidEmail, normalizeEmail, normalizeName, normalizeTags } from "@/lib/contact-rules";
import { MAX_AUTOMATIONS, MAX_STEPS_JSON, parseSteps } from "@/lib/automation-rules";
import { getOwnedAutomation, listAutomations } from "@/lib/automations";
import { reviewAutomation } from "@/lib/automation-review";

type State = { error?: string; message?: string } | undefined;

export async function saveAutomation(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const existing = id ? await getOwnedAutomation(user.$id, id) : null;
  if (id && !existing) return { error: "Automation not found." };
  if (existing?.status === "active") return { error: "Pause the automation before editing it." };

  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 150);
  if (!name) return { error: "Give the automation a name." };

  const triggerType = formData.get("triggerType") === "tag_added" ? "tag_added" : "list_joined";
  let triggerValue = String(formData.get("triggerValue") ?? "").trim();
  if (triggerType === "list_joined") {
    const list = await getOwnedList(user.$id, triggerValue);
    if (!list) return { error: "Choose a list." };
    triggerValue = list.$id;
  } else {
    triggerValue = normalizeTags(triggerValue)[0] ?? "";
    if (!triggerValue) return { error: "Enter the tag that starts this automation." };
  }

  const fromEmail = normalizeEmail(String(formData.get("fromEmail") ?? ""));
  if (!isValidEmail(fromEmail)) return { error: "Enter a valid sender email." };
  const fromName = normalizeName(String(formData.get("fromName") ?? "")).slice(0, 100);

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    return { error: "The steps could not be read." };
  }
  const steps = parseSteps(raw);
  if (!steps) return { error: "Check the steps: waits must be 1 or more, and at most 60 days." };
  const stepsJson = JSON.stringify(steps);
  if (stepsJson.length > MAX_STEPS_JSON) return { error: "The emails are too long in total." };

  const { tablesDB } = createAdminClient();
  const data = { name, triggerType, triggerValue, fromName, fromEmail, steps: stepsJson };

  if (existing) {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, rowId: existing.$id, data });
    revalidatePath(`/automations/${existing.$id}`);
    return { message: "Saved." };
  }

  if ((await listAutomations(user.$id)).length >= MAX_AUTOMATIONS) {
    return { error: `You can have up to ${MAX_AUTOMATIONS} automations.` };
  }
  const row = await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: AUTOMATIONS_TABLE,
    rowId: ID.unique(),
    data: { accountId: user.$id, status: "draft", ...data },
    permissions: [Permission.read(Role.user(user.$id))],
  });
  redirect(`/automations/${row.$id}`);
}

export async function setAutomationStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, String(formData.get("id") ?? ""));
  if (!a) return;

  const to = formData.get("to") === "active" ? "active" : "paused";
  if (to === "active") {
    const { issues } = await reviewAutomation(user.$id, a);
    if (issues.length > 0) return; // the page shows the list of problems
  }

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, rowId: a.$id, data: { status: to },
  });
  revalidatePath(`/automations/${a.$id}`);
  revalidatePath("/automations");
}
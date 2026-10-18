"use server";

import { ID, Permission, Role } from "node-appwrite";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CAMPAIGNS_TABLE } from "@/lib/appwrite/db";
import { getOwnedCampaign, reviewCampaign } from "@/lib/campaigns";
import { filterOwnedListIds } from "@/lib/contacts";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";
import { getQueues } from "@/lib/queue";

type State = { error?: string; message?: string } | undefined;

export async function createCampaign(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();

  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 150);
  const subject = String(formData.get("subject") ?? "").replace(/[\r\n]/g, " ").trim().slice(0, 200);
  const fromName = normalizeName(String(formData.get("fromName") ?? "")).slice(0, 100);
  const fromEmail = normalizeEmail(String(formData.get("fromEmail") ?? ""));
  const html = String(formData.get("html") ?? "");

  if (!name || !subject) return { error: "Enter a campaign name and a subject." };
  if (!isValidEmail(fromEmail)) return { error: "Enter a valid sender email." };
  if (!html.trim()) return { error: "Write the email content." };
  if (html.length > 60000) return { error: "The email is too long (limit 60,000 characters)." };

  const all = formData.get("audienceAll") === "on";
  const listIds = all ? [] : await filterOwnedListIds(user.$id, formData.getAll("listIds").map(String));
  if (!all && listIds.length === 0) return { error: "Choose who gets this email." };

  const { tablesDB } = createAdminClient();
  const row = await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    rowId: ID.unique(),
    data: { accountId: user.$id, name, subject, fromName, fromEmail, html, listIds, status: "draft" },
    permissions: [Permission.read(Role.user(user.$id))],
  });

  redirect(`/campaigns/${row.$id}`);
}

export async function sendCampaign(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user.emailVerification) return;

  const campaign = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!campaign || campaign.status !== "draft") return; // a second click does nothing

  const { issues } = await reviewCampaign(user.$id, campaign);
  if (issues.length > 0) return;

  const { tablesDB } = createAdminClient();
  const update = (data: Record<string, unknown>) =>
    tablesDB.updateRow({ databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: campaign.$id, data });

  await update({ status: "queued", startedAt: new Date().toISOString() });
  try {
    await getQueues().prepare.add(
      "prepare",
      { campaignId: campaign.$id },
      {
        jobId: `prepare_${campaign.$id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (e) {
    console.error("Could not queue campaign", e);
    await update({ status: "draft" }); // Redis down: let the customer try again
  }

  revalidatePath(`/campaigns/${campaign.$id}`);
  revalidatePath("/campaigns");
}
"use server";

import { ID, Permission, Role } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CAMPAIGNS_TABLE } from "@/lib/appwrite/db";
import { getOwnedCampaign, reviewCampaign, scheduleJobId, senderDomainIssue, type CampaignRow } from "@/lib/campaigns";
import { canDeleteCampaign, canEditCampaign } from "@/lib/campaign-status";
import { filterOwnedListIds } from "@/lib/contacts";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";
import { getQueues } from "@/lib/queue";
import { rateLimit } from "@/lib/rate-limit";
import { getProvider } from "@/lib/email";
import { cleanHeader, htmlToText, renderEmail } from "@/lib/email/render";
import { plural } from "@/lib/format";

export type CampaignFormState = { error?: string; message?: string; id?: string; intent?: string } | undefined;
// The other actions return this, so the screen can show a toast and stay where it is.
export type ActionResult = { ok: boolean; message: string; id?: string };

const MAX_HTML = 60000;
const MIN_SCHEDULE_MS = 5 * 60_000; // at least 5 minutes ahead, so there is time to cancel
const MAX_SCHEDULE_MS = 365 * 24 * 3_600_000;

function revalidateCampaigns() {
  revalidatePath("/campaigns", "layout"); // the list, every campaign page, and every report
  revalidatePath("/dashboard");
}

const notFound: ActionResult = { ok: false, message: "Campaign not found." };

// ---------- Create and edit drafts ----------
async function readCampaignForm(accountId: string, formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  const oneLine = (name: string, max: number) => text(name).replace(/[\r\n]/g, " ").trim().slice(0, max);

  const name = normalizeName(text("name")).slice(0, 150);
  const subject = oneLine("subject", 200);
  const previewText = oneLine("previewText", 200);
  const fromName = normalizeName(text("fromName")).slice(0, 100);
  const fromEmail = normalizeEmail(text("fromEmail"));
  const replyTo = normalizeEmail(text("replyTo"));
  const html = text("html");

  if (!name) return { error: "Give the campaign a name." };
  if (!subject) return { error: "Add a subject line." };
  if (!isValidEmail(fromEmail)) return { error: "Enter a valid sender email." };
  if (replyTo && !isValidEmail(replyTo)) return { error: "Enter a valid reply-to email, or leave it empty." };
  if (!html.trim()) return { error: "Write the email content." };
  if (html.length > MAX_HTML) return { error: "The email is too long (limit 60,000 characters)." };

  // An empty list of lists means "all active contacts".
  const all = text("audience") !== "lists";
  const listIds = all ? [] : await filterOwnedListIds(accountId, formData.getAll("listIds").map(String));
  if (!all && listIds.length === 0) return { error: "Choose at least one list, or send to all active contacts." };

  return { data: { name, subject, previewText, fromName, fromEmail, replyTo, html, listIds } };
}

export async function saveCampaign(_: CampaignFormState, formData: FormData): Promise<CampaignFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const existing = id ? await getOwnedCampaign(user.$id, id) : null;
  if (id && !existing) return { error: "Campaign not found." };
  if (existing && !canEditCampaign(existing.status)) {
    return {
      error:
        existing.status === "scheduled"
          ? "Cancel the schedule before you change this campaign."
          : "This campaign was already sent. Duplicate it to send a new version.",
    };
  }

  const form = await readCampaignForm(user.$id, formData);
  if (!form.data) return { error: form.error };

  const { tablesDB } = createAdminClient();
  let rowId = existing?.$id;
  if (existing) {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: existing.$id, data: form.data });
  } else {
    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: CAMPAIGNS_TABLE,
      rowId: ID.unique(),
      data: { accountId: user.$id, status: "draft", ...form.data },
      permissions: [Permission.read(Role.user(user.$id))],
    });
    rowId = row.$id;
  }

  revalidateCampaigns();
  return { message: "Draft saved.", id: rowId, intent: String(formData.get("intent") ?? "save") };
}

// ---------- Send now, schedule, cancel ----------
// The checks before a campaign may go out. Returns the campaign, or the reason it cannot go.
async function readyToSend(formData: FormData) {
  const user = await requireUser();
  if (!user.emailVerification) return { error: "Verify your account email before you send campaigns." };

  const campaign = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!campaign) return { error: notFound.message };
  if (campaign.status !== "draft") return { error: "Only a draft can be sent or scheduled." };

  const { issues, audience } = await reviewCampaign(user.$id, campaign);
  if (issues.length > 0) return { error: issues[0] };
  return { campaign, audience };
}

async function updateCampaign(id: string, data: Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: id, data });
}

export async function sendCampaign(formData: FormData): Promise<ActionResult> {
  const ready = await readyToSend(formData);
  if (!ready.campaign) return { ok: false, message: ready.error };
  const c = ready.campaign;

  await updateCampaign(c.$id, { status: "queued", startedAt: new Date().toISOString() });
  try {
    await getQueues().prepare.add(
      "prepare",
      { campaignId: c.$id },
      {
        jobId: `prepare_${c.$id}`, // a second click cannot queue it twice
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (e) {
    console.error("Could not queue campaign", e);
    await updateCampaign(c.$id, { status: "draft", startedAt: null }); // Redis down: let the customer try again
    return { ok: false, message: "Sending could not start. Try again in a minute." };
  }

  revalidateCampaigns();
  return { ok: true, message: `Sending to ${plural(ready.audience, "contact")} started.` };
}

export async function scheduleCampaign(formData: FormData): Promise<ActionResult> {
  const at = Date.parse(String(formData.get("sendAt") ?? ""));
  if (!Number.isFinite(at)) return { ok: false, message: "Choose a date and time." };
  const wait = at - Date.now();
  if (wait < MIN_SCHEDULE_MS) return { ok: false, message: "Choose a time at least 5 minutes from now." };
  if (wait > MAX_SCHEDULE_MS) return { ok: false, message: "Choose a time within the next 12 months." };

  const ready = await readyToSend(formData);
  if (!ready.campaign) return { ok: false, message: ready.error };
  const c = ready.campaign;
  const scheduledAt = new Date(at).toISOString();

  await updateCampaign(c.$id, { status: "scheduled", scheduledAt });
  try {
    await getQueues().prepare.add(
      "prepare",
      { campaignId: c.$id, scheduledAt },
      {
        jobId: scheduleJobId(c.$id, scheduledAt),
        delay: at - Date.now(),
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (e) {
    console.error("Could not schedule campaign", e);
    await updateCampaign(c.$id, { status: "draft", scheduledAt: null });
    return { ok: false, message: "The campaign could not be scheduled. Try again in a minute." };
  }

  revalidateCampaigns();
  return { ok: true, message: "Campaign scheduled." };
}

// Removes the waiting job. If this fails, the worker still ignores the old job (see prepareCampaign).
async function removeScheduleJob(c: CampaignRow) {
  if (!c.scheduledAt) return;
  try {
    const job = await getQueues().prepare.getJob(scheduleJobId(c.$id, c.scheduledAt));
    await job?.remove();
  } catch (e) {
    console.error("Could not remove the scheduled job", e);
  }
}

export async function cancelSchedule(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!c) return notFound;
  if (c.status !== "scheduled") return { ok: false, message: "This campaign is not scheduled." };
  if (c.scheduledAt && Date.parse(c.scheduledAt) <= Date.now()) {
    return { ok: false, message: "It is too late to cancel: sending has started." };
  }

  await updateCampaign(c.$id, { status: "draft", scheduledAt: null });
  await removeScheduleJob(c);
  revalidateCampaigns();
  return { ok: true, message: "Schedule cancelled. The campaign is a draft again." };
}

// ---------- Test email ----------
export async function sendTestEmail(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.emailVerification) return { ok: false, message: "Verify your account email before you send test emails." };

  const c = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!c) return notFound;

  const emails = [
    ...new Set(String(formData.get("emails") ?? "").split(/[\s,;]+/).map(normalizeEmail).filter(Boolean)),
  ];
  if (emails.length === 0) return { ok: false, message: "Enter at least one email address." };
  if (emails.length > 5) return { ok: false, message: "Send a test to at most 5 addresses." };
  const bad = emails.find((e) => !isValidEmail(e));
  if (bad) return { ok: false, message: `${bad} is not a valid email address.` };

  const limit = await rateLimit("test-email", user.$id, 10, 3600);
  if (!limit.ok) {
    return { ok: false, message: `You sent many tests. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` };
  }
  const domainIssue = isValidEmail(c.fromEmail) ? await senderDomainIssue(user.$id, c.fromEmail) : "Set a valid sender email.";
  if (domainIssue) return { ok: false, message: domainIssue };

  // No tracking, and no working unsubscribe link: a test must not change any contact.
  const fromName = cleanHeader(c.fromName ?? "");
  const results = await Promise.all(
    emails.map((to) => {
      const html = renderEmail(c.html, { name: user.name, email: to }, `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`, undefined, {
        previewText: c.previewText,
      });
      return getProvider().send({
        to,
        from: fromName ? `${fromName} <${c.fromEmail}>` : c.fromEmail,
        subject: cleanHeader(`[Test] ${c.subject}`),
        replyTo: c.replyTo ? cleanHeader(c.replyTo) : undefined,
        html,
        text: htmlToText(html),
      });
    })
  );

  const failed = results.find((r) => !r.ok);
  if (failed && !failed.ok) return { ok: false, message: `The test email was not sent: ${failed.error.slice(0, 160)}` };
  return { ok: true, message: `Test email sent to ${emails.join(", ")}.` };
}

// ---------- Duplicate and delete ----------
export async function duplicateCampaign(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!c) return notFound;

  const { tablesDB } = createAdminClient();
  const row = await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    rowId: ID.unique(),
    data: {
      accountId: user.$id,
      status: "draft",
      name: `${c.name} (copy)`.slice(0, 150),
      subject: c.subject,
      previewText: c.previewText ?? "",
      fromName: c.fromName ?? "",
      fromEmail: c.fromEmail,
      replyTo: c.replyTo ?? "",
      html: c.html,
      listIds: c.listIds ?? [],
    },
    permissions: [Permission.read(Role.user(user.$id))],
  });

  revalidateCampaigns();
  return { ok: true, message: "Campaign duplicated. It is a new draft.", id: row.$id };
}

export async function deleteCampaign(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, String(formData.get("id") ?? ""));
  if (!c) return notFound;
  if (!canDeleteCampaign(c.status)) return { ok: false, message: "A campaign cannot be deleted while it is sending." };

  if (c.status === "scheduled") await removeScheduleJob(c);
  // The sent emails stay in the messages table: contact history and the daily limit still need them.
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: c.$id });

  revalidateCampaigns();
  return { ok: true, message: `Campaign "${c.name}" deleted.` };
}

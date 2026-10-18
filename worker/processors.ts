import type { Job } from "bullmq";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, MESSAGES_TABLE, CAMPAIGNS_TABLE } from "@/lib/appwrite/db";
import {
  audienceQueries, countMessages, getCampaignById, messageIdFor,
  type CampaignRow, type MessageRow,
} from "@/lib/campaigns";
import { getQueues } from "@/lib/queue";
import { getProvider } from "@/lib/email";
import { renderEmail, htmlToText, cleanHeader } from "@/lib/email/render";
import { signToken } from "@/lib/unsubscribe-token";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isConflict = (e: unknown) => (e as { code?: number })?.code === 409;

// ---------- 1. Prepare: one message per person ----------
async function createMessages(rows: Record<string, unknown>[]) {
  const { tablesDB } = createAdminClient();
  try {
    await tablesDB.createRows({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rows });
  } catch {
    // Bulk create is all-or-nothing. If some rows exist (the job ran before), add one by one.
    for (const { $id, ...data } of rows) {
      try {
        await tablesDB.createRow({
          databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: $id as string, data,
        });
      } catch (e) {
        if (!isConflict(e)) throw e;
      }
    }
  }
}

export async function prepareCampaign(job: Job<{ campaignId: string }>) {
  const { tablesDB } = createAdminClient();
  const campaign = await getCampaignById(job.data.campaignId);
  if (!campaign || campaign.status !== "queued") return;

  const { email: emailQueue } = getQueues();
  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const queries = [...audienceQueries(campaign.accountId, campaign.listIds ?? []), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await tablesDB.listRows({ databaseId: DB_ID, tableId: CONTACTS_TABLE, queries });
    const contacts = page.rows as unknown as { $id: string; email: string; name: string | null }[];
    if (contacts.length === 0) break;

    const rows = contacts.map((c) => ({
      $id: messageIdFor(campaign.$id, c.$id),
      accountId: campaign.accountId,
      campaignId: campaign.$id,
      contactId: c.$id,
      email: c.email,
      name: c.name ?? "",
      status: "queued",
      attempts: 0,
    }));

    await createMessages(rows);
    await emailQueue.addBulk(
      rows.map((r) => ({
        name: "send",
        data: { messageId: r.$id, campaignId: campaign.$id },
        opts: {
          jobId: r.$id, // the same message cannot be queued twice
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 86400 },
        },
      }))
    );

    total += rows.length;
    await job.updateProgress(total);
    if (contacts.length < 100) break;
    cursor = contacts[contacts.length - 1].$id;
  }

  await tablesDB.updateRow({
    databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: campaign.$id, data: { status: "sending" },
  });
  await finalizeCampaigns(); // in case everything was already sent
}

// ---------- 2. Send one email ----------
const cache = new Map<string, { at: number; value: CampaignRow }>();
async function cachedCampaign(id: string) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.value;
  const value = await getCampaignById(id);
  if (value) cache.set(id, { at: Date.now(), value });
  return value;
}

async function updateMessage(id: string, data: Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  for (let i = 1; i <= 3; i++) {
    try {
      await tablesDB.updateRow({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: id, data });
      return true;
    } catch (e) {
      if (i === 3) console.error(`Could not save result for message ${id}`, e);
      else await sleep(500 * i);
    }
  }
  return false;
}

const notFound = (e: unknown) => (e as { code?: number })?.code === 404;

export async function sendEmail(job: Job<{ messageId: string; campaignId: string }>) {
  const { tablesDB } = createAdminClient();
  const { messageId, campaignId } = job.data;

  // 1. Never send twice: only a "queued" message may be sent.
  let msg: MessageRow;
  try {
    msg = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: messageId,
    })) as unknown as MessageRow;
  } catch (e) {
    if (notFound(e)) return; // message is gone
    throw e; // temporary problem: try again later
  }
  if (msg.status !== "queued") return;

  // 2. Does this person still want emails? (They may have unsubscribed a minute ago.)
  let contactStatus: string | null = null;
  try {
    const contact = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: msg.contactId,
    })) as unknown as { status: string };
    contactStatus = contact.status;
  } catch (e) {
    if (!notFound(e)) throw e; // deleted contact: contactStatus stays null
  }
  if (contactStatus !== "active") {
    await updateMessage(messageId, {
      status: "skipped",
      error: contactStatus ? `Contact is ${contactStatus}` : "Contact was deleted",
    });
    return;
  }

  // 3. Build and send
  const campaign = await cachedCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const base = process.env.NEXT_PUBLIC_APP_URL;
  const token = signToken(msg.contactId);
  const pageUrl = `${base}/unsubscribe?t=${token}`;        // link in the footer
  const oneClickUrl = `${base}/api/unsubscribe?t=${token}`; // for the mail app's own button

  const html = renderEmail(campaign.html, { name: msg.name, email: msg.email }, pageUrl);
  const fromName = cleanHeader(campaign.fromName ?? "");

  const res = await getProvider().send({
    to: msg.email,
    from: fromName ? `${fromName} <${campaign.fromEmail}>` : campaign.fromEmail,
    subject: cleanHeader(campaign.subject),
    html,
    text: htmlToText(html),
    headers: {
      "List-Unsubscribe": `<${oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  const attempts = job.attemptsMade + 1;
  if (res.ok) {
    await updateMessage(messageId, {
      status: "sent", providerMessageId: res.messageId.slice(0, 200),
      sentAt: new Date().toISOString(), attempts,
    });
    return; // if saving failed we still return, so we never send a second copy
  }
  if (!res.retryable) {
    await updateMessage(messageId, { status: "failed", error: res.error, attempts });
    return;
  }
  throw new Error(res.error); // BullMQ waits and tries again
}

export async function markMessageFailed(messageId: string, error: string, attempts: number) {
  await updateMessage(messageId, { status: "failed", error: error.slice(0, 500), attempts });
}

// ---------- 3. Finish campaigns with nothing left to send ----------
export async function finalizeCampaigns() {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    queries: [Query.equal("status", "sending"), Query.limit(50)],
  });
  for (const c of res.rows as unknown as CampaignRow[]) {
    if ((await countMessages(c.$id, "queued")) === 0) {
      await tablesDB.updateRow({
        databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: c.$id,
        data: { status: "sent", finishedAt: new Date().toISOString() },
      });
    }
  }
}

export async function markCampaignFailed(campaignId: string) {
  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: campaignId, data: { status: "failed" },
  });
}
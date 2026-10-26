import { createHash } from "crypto";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import {
  DB_ID, CAMPAIGNS_TABLE, MESSAGES_TABLE, CONTACTS_TABLE, DOMAINS_TABLE,
} from "@/lib/appwrite/db";
import { isValidEmail } from "@/lib/contact-rules";
import { TAB_STATUSES, type CampaignTab } from "@/lib/campaign-status";

export type CampaignRow = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  accountId: string;
  name: string;
  subject: string;
  previewText?: string | null; // the text inbox apps show next to the subject
  fromName: string | null;
  fromEmail: string;
  replyTo?: string | null;
  html: string;
  listIds: string[];
  status: string; // draft | scheduled | queued | sending | sent | failed
  scheduledAt?: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type MessageRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  campaignId: string;
  contactId: string;
  email: string;
  name: string | null;
  status: string; // queued | sent | failed | skipped
  error?: string | null;
  sentAt?: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

// The prepare job of a scheduled campaign. The time is part of the ID, so a new schedule
// never collides with an old (cancelled) one.
export const scheduleJobId = (campaignId: string, at: string) => `prepare_${campaignId}_${Date.parse(at)}`;

// Same campaign + same contact = same message ID. A person cannot get two rows.
export function messageIdFor(campaignId: string, contactId: string) {
  return createHash("sha1").update(`${campaignId}:${contactId}`).digest("hex").slice(0, 32);
}

// Who gets the campaign: active contacts only, in any of the chosen lists
// (an empty list means "all active contacts").
export function audienceQueries(accountId: string, listIds: string[]) {
  const q = [Query.equal("accountId", accountId), Query.equal("status", "active")];
  if (listIds.length === 1) q.push(Query.contains("listIds", listIds[0]));
  else if (listIds.length > 1) q.push(Query.or(listIds.map((id) => Query.contains("listIds", id))));
  return q;
}

export async function countAudience(accountId: string, listIds: string[]) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [...audienceQueries(accountId, listIds), Query.limit(1)],
  });
  return res.total;
}

export async function getCampaignById(id: string) {
  const { tablesDB } = createAdminClient();
  try {
    return (await tablesDB.getRow({
      databaseId: DB_ID, tableId: CAMPAIGNS_TABLE, rowId: id,
    })) as unknown as CampaignRow;
  } catch {
    return null;
  }
}

export async function getOwnedCampaign(accountId: string, id: string) {
  const c = await getCampaignById(id);
  return c && c.accountId === accountId ? c : null;
}

export async function countMessages(campaignId: string, status?: string) {
  const { tablesDB } = createAdminClient();
  const queries = [Query.equal("campaignId", campaignId), Query.limit(1)];
  if (status) queries.push(Query.equal("status", status));
  const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: MESSAGES_TABLE, queries });
  return res.total;
}

export async function countCreatedToday(accountId: string) {
  const { tablesDB } = createAdminClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: MESSAGES_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.greaterThanEqual("$createdAt", start.toISOString()),
      Query.limit(1),
    ],
  });
  return res.total;
}

// One problem (or null) for each part of the campaign, so the screen can show a checklist.
export type CampaignChecks = {
  audience: string | null;
  sender: string | null;
  subject: string | null;
  content: string | null;
  limit: string | null;
};

// US-5.3: the checklist before sending. Empty "issues" means ready.
export async function reviewCampaign(accountId: string, c: CampaignRow) {
  const checks: CampaignChecks = { audience: null, sender: null, subject: null, content: null, limit: null };

  if (!c.subject.trim()) checks.subject = "Add a subject line.";

  if (!c.html.trim()) checks.content = "The email is empty.";
  else if (/href\s*=\s*["']\s*(javascript|data):/i.test(c.html)) {
    checks.content = "Links starting with javascript: or data: are not allowed.";
  } else if (/href\s*=\s*["']https?:\/\/(www\.)?example\.com/i.test(c.html)) {
    checks.content = "Replace the example.com links of the template with your own links.";
  }

  checks.sender = isValidEmail(c.fromEmail)
    ? await senderDomainIssue(accountId, c.fromEmail)
    : "Set a valid sender email.";

  const audience = await countAudience(accountId, c.listIds ?? []);
  if (audience === 0) checks.audience = "No active contacts match this audience.";

  const limit = Number(process.env.DAILY_SEND_LIMIT ?? 5000);
  const used = await countCreatedToday(accountId);
  if (used + audience > limit) {
    checks.limit = `Daily limit is ${limit} emails. You have ${Math.max(0, limit - used)} left today.`;
  }

  const issues = Object.values(checks).filter((x): x is string => Boolean(x));
  return { audience, issues, checks };
}

export async function senderDomainIssue(accountId: string, fromEmail: string) {
  if (process.env.REQUIRE_VERIFIED_DOMAIN !== "true") return null;
  const fromDomain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: DOMAINS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.equal("domain", fromDomain),
      Query.equal("status", "verified"),
      Query.limit(1),
    ],
  });
  return res.total === 0 ? `The domain ${fromDomain} is not verified yet.` : null;
}
// ---------- Campaigns screen ----------
export const CAMPAIGN_PAGE_SIZE = 20;

function campaignQueries(accountId: string, f: { q?: string; tab?: string }) {
  const queries = [Query.equal("accountId", accountId)];
  const statuses = TAB_STATUSES[f.tab as CampaignTab];
  if (statuses) queries.push(Query.equal("status", statuses));
  const q = f.q?.trim();
  if (q) queries.push(Query.or([Query.contains("name", q), Query.contains("subject", q)]));
  return queries;
}

export async function searchCampaigns(accountId: string, f: { q?: string; tab?: string; page: number }) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    queries: [
      ...campaignQueries(accountId, f),
      Query.orderDesc("$createdAt"),
      Query.limit(CAMPAIGN_PAGE_SIZE),
      Query.offset((f.page - 1) * CAMPAIGN_PAGE_SIZE),
    ],
  });
  return { rows: res.rows as unknown as CampaignRow[], total: res.total };
}

// The numbers on the tabs. The search still applies.
export async function countCampaignsByTab(accountId: string, q?: string) {
  const { tablesDB } = createAdminClient();
  const tabs = Object.keys(TAB_STATUSES) as CampaignTab[];
  const totals = await Promise.all(
    tabs.map(async (tab) => {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: CAMPAIGNS_TABLE,
        queries: [...campaignQueries(accountId, { q, tab }), Query.limit(1)],
      });
      return res.total;
    })
  );
  return Object.fromEntries(tabs.map((t, i) => [t, totals[i]])) as Record<CampaignTab, number>;
}

// Sent, unique opens, and unique clicks of one campaign.
export async function campaignStats(campaignId: string) {
  const { tablesDB } = createAdminClient();
  const count = async (extra: string[]) =>
    (await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: MESSAGES_TABLE,
      queries: [Query.equal("campaignId", campaignId), ...extra, Query.limit(1)],
    })).total;
  const [sent, opened, clicked] = await Promise.all([
    count([Query.equal("status", "sent")]),
    count([Query.isNotNull("openedAt")]),
    count([Query.isNotNull("clickedAt")]),
  ]);
  return { sent, opened, clicked };
}

// The sender of the newest campaign. A new campaign starts with it, so the user does not type it again.
export async function lastSender(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.orderDesc("$createdAt"), Query.limit(1)],
  });
  const c = res.rows[0] as unknown as CampaignRow | undefined;
  return { fromName: c?.fromName ?? "", fromEmail: c?.fromEmail ?? "", replyTo: c?.replyTo ?? "" };
}

// ---------- Recipients of one campaign (report) ----------
export const RECIPIENT_FILTERS = ["all", "opened", "clicked", "not_opened", "not_sent"] as const;
export type RecipientFilter = (typeof RECIPIENT_FILTERS)[number];
export const RECIPIENT_PAGE_SIZE = 25;

function recipientQueries(campaignId: string, filter: RecipientFilter) {
  const queries = [Query.equal("campaignId", campaignId)];
  if (filter === "opened") queries.push(Query.isNotNull("openedAt"));
  if (filter === "clicked") queries.push(Query.isNotNull("clickedAt"));
  if (filter === "not_opened") queries.push(Query.equal("status", "sent"), Query.isNull("openedAt"));
  if (filter === "not_sent") queries.push(Query.equal("status", ["failed", "skipped"]));
  return queries;
}

export async function listRecipients(campaignId: string, filter: RecipientFilter, page: number) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: MESSAGES_TABLE,
    queries: [
      ...recipientQueries(campaignId, filter),
      Query.orderAsc("email"),
      Query.limit(RECIPIENT_PAGE_SIZE),
      Query.offset((page - 1) * RECIPIENT_PAGE_SIZE),
    ],
  });
  return { rows: res.rows as unknown as MessageRow[], total: res.total };
}

export async function countRecipients(campaignId: string) {
  const { tablesDB } = createAdminClient();
  const totals = await Promise.all(
    RECIPIENT_FILTERS.map(async (f) => {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: MESSAGES_TABLE,
        queries: [...recipientQueries(campaignId, f), Query.limit(1)],
      });
      return res.total;
    })
  );
  return Object.fromEntries(RECIPIENT_FILTERS.map((f, i) => [f, totals[i]])) as Record<RecipientFilter, number>;
}

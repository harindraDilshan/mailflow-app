import { createHash } from "crypto";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import {
  DB_ID, CAMPAIGNS_TABLE, MESSAGES_TABLE, CONTACTS_TABLE, DOMAINS_TABLE,
} from "@/lib/appwrite/db";

export type CampaignRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  name: string;
  subject: string;
  fromName: string | null;
  fromEmail: string;
  html: string;
  listIds: string[];
  status: string; // draft | queued | sending | sent | failed
  startedAt: string | null;
  finishedAt: string | null;
};

export type MessageRow = {
  $id: string;
  accountId: string;
  campaignId: string;
  contactId: string;
  email: string;
  name: string | null;
  status: string; // queued | sent | failed
  openedAt: string | null;
  clickedAt: string | null;
};

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

async function countCreatedToday(accountId: string) {
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

// US-5.3: the checklist before sending. Empty "issues" means ready.
export async function reviewCampaign(accountId: string, c: CampaignRow) {
  const issues: string[] = [];

  if (!c.subject.trim()) issues.push("Add a subject.");
  if (!c.html.trim()) issues.push("The email is empty.");
  if (/href\s*=\s*["']\s*(javascript|data):/i.test(c.html)) {
    issues.push("Links starting with javascript: or data: are not allowed.");
  }

  if (process.env.REQUIRE_VERIFIED_DOMAIN === "true") {
    const fromDomain = c.fromEmail.split("@")[1]?.toLowerCase() ?? "";
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
    if (res.total === 0) issues.push(`The domain ${fromDomain} is not verified yet.`);
  }

  const audience = await countAudience(accountId, c.listIds ?? []);
  if (audience === 0) issues.push("No active contacts match this audience.");

  const limit = Number(process.env.DAILY_SEND_LIMIT ?? 5000);
  const used = await countCreatedToday(accountId);
  if (used + audience > limit) {
    issues.push(`Daily limit is ${limit} emails. You have ${Math.max(0, limit - used)} left today.`);
  }

  return { audience, issues };
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
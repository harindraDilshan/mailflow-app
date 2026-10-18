import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, MESSAGES_TABLE, EVENTS_TABLE } from "@/lib/appwrite/db";
import type { CampaignRow } from "@/lib/campaigns";
import { extractLinks } from "@/lib/email/render";
import { hashUrl } from "@/lib/tracking-token";

async function count(tableId: string, queries: string[]) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID, tableId, queries: [...queries, Query.limit(1)],
  });
  return res.total;
}

export async function getCampaignReport(c: CampaignRow) {
  const msg = (extra: string[] = []) =>
    count(MESSAGES_TABLE, [Query.equal("campaignId", c.$id), ...extra]);
  const ev = (type: string, extra: string[] = []) =>
    count(EVENTS_TABLE, [Query.equal("campaignId", c.$id), Query.equal("type", type), ...extra]);

  const [
    sent, failed, skipped, queued,
    uniqueOpens, uniqueClicks,
    delivered, bounces, complaints, unsubscribes,
    totalOpens, totalClicks,
  ] = await Promise.all([
    msg([Query.equal("status", "sent")]),
    msg([Query.equal("status", "failed")]),
    msg([Query.equal("status", "skipped")]),
    msg([Query.equal("status", "queued")]),
    msg([Query.isNotNull("openedAt")]),
    msg([Query.isNotNull("clickedAt")]),
    ev("delivered"),
    ev("bounce"),
    ev("complaint"),
    ev("unsubscribe"),
    ev("open"),
    ev("click"),
  ]);

  const links = extractLinks(c.html).slice(0, 30);
  const perLink = await Promise.all(
    links.map(async (url) => ({
      url,
      clicks: await ev("click", [Query.equal("urlHash", hashUrl(url))]),
    }))
  );
  perLink.sort((a, b) => b.clicks - a.clicks);

  return {
    sent, failed, skipped, queued,
    uniqueOpens, uniqueClicks, totalOpens, totalClicks,
    delivered, bounces, complaints, unsubscribes,
    links: perLink,
  };
}
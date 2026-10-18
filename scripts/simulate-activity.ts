import { createHash } from "crypto";
import { Query } from "node-appwrite";
import { createAdminClient } from "../lib/appwrite/admin";
import { DB_ID, MESSAGES_TABLE } from "../lib/appwrite/db";
import { getCampaignById, type MessageRow } from "../lib/campaigns";
import { extractLinks } from "../lib/email/render";
import { signClick, signOpen } from "../lib/tracking-token";
import { signToken } from "../lib/unsubscribe-token";
import { recordOnce } from "../lib/events";

const campaignId = process.argv[2];
const arg = (name: string, def: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const rates = {
  deliver: arg("deliver", 97),
  bounce: arg("bounce", 2),
  open: arg("open", 40),
  click: arg("click", 15),
  complain: arg("complain", 1),
  unsub: arg("unsub", 1),
};

// 0..100, always the same for the same message and reason
const roll = (id: string, salt: string) =>
  (parseInt(createHash("sha1").update(id + salt).digest("hex").slice(0, 6), 16) / 0xffffff) * 100;

async function main() {
  if (!campaignId) {
    console.error("Usage: npm run simulate -- <campaignId> [--deliver 97 --bounce 2 --open 40 --click 15 --complain 1 --unsub 1]");
    process.exit(1);
  }
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const links = extractLinks(campaign.html);
  const { tablesDB } = createAdminClient();
  const headers = { "User-Agent": "simulator" };

  const n = { messages: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, complained: 0, unsub: 0 };

  async function one(m: MessageRow) {
    n.messages++;
    if (roll(m.$id, "bounce") < rates.bounce) {
      await recordOnce(m.$id, "bounce");
      n.bounced++;
      return;
    }
    if (roll(m.$id, "deliver") >= rates.deliver) return; // not delivered, no activity
    await recordOnce(m.$id, "delivered");
    n.delivered++;

    if (roll(m.$id, "open") < rates.open) {
      await fetch(`${base}/t/o/${signOpen(m.$id)}`, { headers });
      n.opened++;
    }
    if (links.length > 0 && roll(m.$id, "click") < rates.click) {
      // squared roll: the first links get more clicks than the last ones
      const idx = Math.floor(Math.pow(roll(m.$id, "link") / 100, 2) * links.length);
      await fetch(`${base}/t/c/${signClick(m.$id, links[idx])}`, { headers, redirect: "manual" });
      n.clicked++;
    }
    if (roll(m.$id, "complain") < rates.complain) {
      await recordOnce(m.$id, "complaint");
      n.complained++;
    }
    if (roll(m.$id, "unsub") < rates.unsub) {
      await fetch(`${base}/api/unsubscribe?t=${signToken(m.contactId, m.$id)}`, { method: "POST" });
      n.unsub++;
    }
  }

  let cursor: string | undefined;
  while (true) {
    const queries = [Query.equal("campaignId", campaignId), Query.equal("status", "sent"), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await tablesDB.listRows({ databaseId: DB_ID, tableId: MESSAGES_TABLE, queries });
    const rows = page.rows as unknown as MessageRow[];
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += 5) await Promise.all(rows.slice(i, i + 5).map(one));

    if (rows.length < 100) break;
    cursor = rows[rows.length - 1].$id;
  }

  console.log("Simulated:", n);
  console.log("Wait a few seconds, then open the report. Events are saved after each response.");
}

main().catch((e) => { console.error(e); process.exit(1); });
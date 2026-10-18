import Link from "next/link";
import { Query } from "node-appwrite";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CAMPAIGNS_TABLE } from "@/lib/appwrite/db";
import type { CampaignRow } from "@/lib/campaigns";

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", queued: "Preparing", sending: "Sending", sent: "Done", failed: "Failed",
};

export default async function CampaignsPage() {
  const user = await requireUser();
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CAMPAIGNS_TABLE,
    queries: [Query.equal("accountId", user.$id), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  const campaigns = res.rows as unknown as CampaignRow[];

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Link href="/campaigns/new" className="underline">New campaign</Link>
      </div>
      <ul className="space-y-2">
        {campaigns.length === 0 && <li className="text-sm text-gray-500">No campaigns yet.</li>}
        {campaigns.map((c) => (
          <li key={c.$id} className="flex items-center justify-between rounded border p-3">
            <Link href={`/campaigns/${c.$id}`} className="underline">{c.name}</Link>
            <span className="text-sm">{STATUS_LABEL[c.status] ?? c.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
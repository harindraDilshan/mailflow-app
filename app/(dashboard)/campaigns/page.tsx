import Link from "next/link";
import { Query } from "node-appwrite";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CAMPAIGNS_TABLE } from "@/lib/appwrite/db";
import type { CampaignRow } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  queued: "Preparing",
  sending: "Sending",
  sent: "Done",
  failed: "Failed",
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
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Campaigns
          </h1>
          <p className="text-xs text-muted-foreground">
            Broadcasts and newsletters sent to your subscriber lists
          </p>
        </div>
        <Button size="sm" render={<Link href="/campaigns/new" />}>
          <Plus className="size-3.5" />
          <span>New Campaign</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>
            History, audience targeting, and delivery status of your email broadcasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {campaigns.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No campaigns created yet. Click "New Campaign" to create your first email.
              </p>
            )}
            {campaigns.map((c) => (
              <div key={c.$id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <Link
                    href={`/campaigns/${c.$id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                  {c.subject && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      Subject: {c.subject}
                    </p>
                  )}
                </div>
                <Badge
                  variant={c.status === "sent" ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

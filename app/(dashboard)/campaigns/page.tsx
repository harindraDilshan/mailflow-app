import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  CAMPAIGN_PAGE_SIZE, campaignStats, countCampaignsByTab, countCreatedToday, searchCampaigns,
} from "@/lib/campaigns";
import { CAMPAIGN_TABS, hasReport, type CampaignTab } from "@/lib/campaign-status";
import { listOwnedLists } from "@/lib/contacts";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignsView, type CampaignItem } from "./campaigns-view";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default function CampaignsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="text-xs text-muted-foreground">Newsletters and announcements that you send to your contacts</p>
          <Suspense fallback={<Skeleton className="mt-2 h-3 w-48" />}>
            <DailyUsage />
          </Suspense>
        </div>
        <Button size="sm" render={<Link href="/campaigns/new" />}>
          <Plus />
          New campaign
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <CampaignsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// "120 of 5,000 emails sent today". Campaigns and automations share this daily limit.
async function DailyUsage() {
  const user = await requireUser();
  const used = await countCreatedToday(user.$id);
  const limit = Number(process.env.DAILY_SEND_LIMIT ?? 5000);
  const percent = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground" title="The limit starts again at 00:00 UTC.">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full", percent >= 90 ? "bg-destructive" : "bg-primary")} style={{ width: `${percent}%` }} />
      </div>
      <span className="tabular-nums">
        {formatNumber(used)} of {formatNumber(limit)} emails sent today
      </span>
    </div>
  );
}

async function CampaignsContent({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const tab = one(raw.tab);
  const view = {
    q: one(raw.q),
    tab: tab && (CAMPAIGN_TABS as readonly string[]).includes(tab) && tab !== "all" ? tab : undefined,
    page: Math.max(1, parseInt(one(raw.page) ?? "1", 10) || 1),
  };

  const user = await requireUser();
  const [result, counts, lists] = await Promise.all([
    searchCampaigns(user.$id, view),
    countCampaignsByTab(user.$id, view.q),
    listOwnedLists(user.$id),
  ]);
  const stats = await Promise.all(result.rows.map((c) => (hasReport(c.status) ? campaignStats(c.$id) : null)));
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  const rows: CampaignItem[] = result.rows.map((c, i) => {
    const names = (c.listIds ?? []).map((id) => listName.get(id)).filter(Boolean);
    return {
      id: c.$id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      audience: (c.listIds ?? []).length === 0 ? "All active contacts" : names.join(", ") || "Deleted lists",
      createdAt: c.$createdAt,
      updatedAt: c.$updatedAt,
      scheduledAt: c.scheduledAt ?? null,
      startedAt: c.startedAt,
      stats: stats[i],
    };
  });

  return (
    <CampaignsView
      view={view}
      rows={rows}
      total={result.total}
      counts={counts as Record<CampaignTab, number>}
      pageSize={CAMPAIGN_PAGE_SIZE}
    />
  );
}

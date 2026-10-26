"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3, ChevronLeft, ChevronRight, Copy, Eye, Loader2, Mail, MoreHorizontal, PencilLine, Plus, Search, SearchX,
  Trash2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DebouncedInput } from "@/components/debounced-input";
import { LocalTime } from "@/components/local-time";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { useConfirm } from "@/components/confirm-dialog";
import {
  CAMPAIGN_TABS, CAMPAIGN_TAB_LABEL, canDeleteCampaign, canEditCampaign, hasReport, type CampaignTab,
} from "@/lib/campaign-status";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelSchedule, deleteCampaign, duplicateCampaign } from "./actions";
import { runAction } from "./run-action";

export type CampaignsListView = { q?: string; tab?: string; page: number };

export type CampaignItem = {
  id: string;
  name: string;
  subject: string;
  status: string;
  audience: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
  stats: { sent: number; opened: number; clicked: number } | null;
};

const rate = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "—");

function Metric({ value, base }: { value: number; base: number }) {
  return (
    <div className="text-right tabular-nums">
      <div className="text-sm">{rate(value, base)}</div>
      <div className="text-[11px] text-muted-foreground">{formatNumber(value)}</div>
    </div>
  );
}

function When({ c }: { c: CampaignItem }) {
  if (c.status === "draft") {
    return (
      <>
        Edited <LocalTime iso={c.updatedAt} dateOnly />
      </>
    );
  }
  if (c.status === "scheduled") return <LocalTime iso={c.scheduledAt} />;
  return <LocalTime iso={c.startedAt ?? c.createdAt} />;
}

export function CampaignsView({
  view,
  rows,
  total,
  counts,
  pageSize,
}: {
  view: CampaignsListView;
  rows: CampaignItem[];
  total: number;
  counts: Record<CampaignTab, number>;
  pageSize: number;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [acting, startAction] = useTransition();
  const [shown, setShown] = useOptimistic(view);
  const [confirmDialog, confirm] = useConfirm();

  function navigate(patch: Partial<CampaignsListView>, opts?: { replace?: boolean }) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === 1) params.delete(k);
      else params.set(k, String(v));
    }
    if (!("page" in patch)) params.delete("page");
    const qs = params.toString();
    const url = qs ? `/campaigns?${qs}` : "/campaigns";
    startNavigation(() => {
      setShown((cur) => ({ ...cur, ...patch, page: patch.page ?? 1 }));
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }

  function duplicate(c: CampaignItem) {
    startAction(async () => {
      const res = await runAction(duplicateCampaign, { id: c.id });
      if (res?.ok && res.id) router.push(`/campaigns/${res.id}/edit`);
    });
  }

  function remove(c: CampaignItem) {
    confirm({
      title: `Delete "${c.name}"?`,
      description:
        c.status === "draft"
          ? "You cannot undo this."
          : "Its report is deleted too. The contacts keep the email in their history. You cannot undo this.",
      confirmLabel: "Delete campaign",
      destructive: true,
      onConfirm: () => runAction(deleteCampaign, { id: c.id }),
    });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (view.page - 1) * pageSize + 1;
  const last = Math.min(total, view.page * pageSize);
  const noCampaigns = counts.all === 0 && !view.q;

  return (
    <div className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs value={shown.tab ?? "all"} onValueChange={(v) => navigate({ tab: v === "all" ? undefined : String(v) })}>
          <TabsList variant="line" aria-label="Filter by status">
            {CAMPAIGN_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="flex-none px-2 text-xs">
                {CAMPAIGN_TAB_LABEL[t]}
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-normal text-muted-foreground tabular-nums">
                  {formatNumber(counts[t])}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-full sm:w-72">
          <DebouncedInput
            value={view.q ?? ""}
            onCommit={(q) => navigate({ q: q || undefined }, { replace: true })}
            icon={<Search />}
            clearable
            placeholder="Search by name or subject"
            aria-label="Search campaigns"
            className="h-8 text-xs"
          />
        </div>
        {(navigating || acting) && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
              {noCampaigns ? <Mail className="size-5 text-muted-foreground" /> : <SearchX className="size-5 text-muted-foreground" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-medium">{noCampaigns ? "No campaigns yet" : "No campaigns match this view"}</h2>
              <p className="max-w-sm text-xs text-muted-foreground">
                {noCampaigns
                  ? "A campaign is one email that you send to your contacts, like a newsletter or an announcement."
                  : "Try another tab or other words."}
              </p>
            </div>
            {noCampaigns ? (
              <Button size="sm" render={<Link href="/campaigns/new" />}>
                <Plus />
                Create your first campaign
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate({ q: undefined, tab: undefined })}>
                Show all campaigns
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          aria-busy={navigating}
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-opacity",
            navigating && "opacity-60"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="hidden text-xs lg:table-cell">Audience</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">Recipients</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">Opened</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">Clicked</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Date</TableHead>
                <TableHead className="w-10 pr-3">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-72 pl-4">
                    <Link href={`/campaigns/${c.id}`} className="block truncate text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{c.subject}</div>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-xs text-muted-foreground lg:table-cell">
                    {c.audience}
                  </TableCell>
                  {c.stats ? (
                    <>
                      <TableCell className="hidden text-right text-sm tabular-nums md:table-cell">
                        {formatNumber(c.stats.sent)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Metric value={c.stats.opened} base={c.stats.sent} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Metric value={c.stats.clicked} base={c.stats.sent} />
                      </TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={3} className="hidden text-center text-xs text-muted-foreground md:table-cell">
                      {c.status === "scheduled" ? "Not sent yet" : "—"}
                    </TableCell>
                  )}
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    <When c={c} />
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem render={<Link href={`/campaigns/${c.id}`} />}>
                          <Eye />
                          {c.status === "draft" ? "Review and send" : "Open"}
                        </DropdownMenuItem>
                        {canEditCampaign(c.status) && (
                          <DropdownMenuItem render={<Link href={`/campaigns/${c.id}/edit`} />}>
                            <PencilLine />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {hasReport(c.status) && (
                          <DropdownMenuItem render={<Link href={`/campaigns/${c.id}/report`} />}>
                            <BarChart3 />
                            View report
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => duplicate(c)}>
                          <Copy />
                          Duplicate
                        </DropdownMenuItem>
                        {c.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => startAction(() => runAction(cancelSchedule, { id: c.id }).then(() => {}))}>
                            <XCircle />
                            Cancel schedule
                          </DropdownMenuItem>
                        )}
                        {canDeleteCampaign(c.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => remove(c)}>
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            Showing {formatNumber(first)}–{formatNumber(last)} of {plural(total, "campaign")}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={view.page <= 1} onClick={() => navigate({ page: view.page - 1 })} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={view.page >= pages} onClick={() => navigate({ page: view.page + 1 })} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

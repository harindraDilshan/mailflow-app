import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocalTime } from "@/components/local-time";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { requireUser } from "@/lib/auth";
import {
  RECIPIENT_FILTERS, RECIPIENT_PAGE_SIZE, countRecipients, getOwnedCampaign, listRecipients, type RecipientFilter,
} from "@/lib/campaigns";
import { hasReport, isSendingStatus } from "@/lib/campaign-status";
import { getCampaignReport } from "@/lib/reports";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pct = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "—");

// Industry limits that mailbox providers watch. Above them, emails start to go to spam.
const MAX_BOUNCE_RATE = 0.02;
const MAX_COMPLAINT_RATE = 0.001;

const FILTER_LABEL: Record<RecipientFilter, string> = {
  all: "All",
  opened: "Opened",
  clicked: "Clicked",
  not_opened: "Did not open",
  not_sent: "Not sent",
};

const MESSAGE_STATUS: Record<string, string> = { queued: "Waiting", sent: "Sent", failed: "Failed", skipped: "Not sent" };

export default function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl space-y-6" aria-busy aria-label="Loading report">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-10 w-96" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      }
    >
      <ReportContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, base, children }: { label: string; value: number; base: number; children?: ReactNode }) {
  const width = base > 0 ? Math.max(1, Math.round((value / base) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatNumber(value)} · {pct(value, base)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      {children}
    </div>
  );
}

async function ReportContent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const asked = one(sp.r);
  const filter: RecipientFilter = (RECIPIENT_FILTERS as readonly string[]).includes(asked ?? "") ? (asked as RecipientFilter) : "all";
  const page = Math.max(1, parseInt(one(sp.rp) ?? "1", 10) || 1);

  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  if (!hasReport(c.status)) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm font-medium">This campaign was not sent yet</p>
          <p className="text-xs text-muted-foreground">The report shows here after you send it.</p>
          <Button size="sm" variant="outline" render={<Link href={`/campaigns/${c.$id}`} />}>
            Back to the campaign
          </Button>
        </CardContent>
      </Card>
    );
  }

  const [r, counts, recipients] = await Promise.all([
    getCampaignReport(c),
    countRecipients(c.$id),
    listRecipients(c.$id, filter, page),
  ]);

  const audience = r.sent + r.failed + r.skipped + r.queued;
  // Rates use delivered emails when SES reports deliveries, else sent emails.
  const base = r.delivered > 0 ? r.delivered : r.sent;
  const bounceRate = r.sent > 0 ? r.bounces / r.sent : 0;
  const complaintRate = r.sent > 0 ? r.complaints / r.sent : 0;
  const totalLinkClicks = r.links.reduce((n, l) => n + l.clicks, 0);
  const pages = Math.max(1, Math.ceil(recipients.total / RECIPIENT_PAGE_SIZE));
  const href = (f: RecipientFilter, p = 1) =>
    `/campaigns/${c.$id}/report?${new URLSearchParams({ ...(f !== "all" ? { r: f } : {}), ...(p > 1 ? { rp: String(p) } : {}) })}`;

  return (
    <div className="max-w-5xl space-y-6">
      <AutoRefresh active={isSendingStatus(c.status)} every={5000} />

      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href={`/campaigns/${c.$id}`} />}>
          <ArrowLeft />
          Campaign
        </Button>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{c.name}</h1>
            <CampaignStatusBadge status={c.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            Subject: {c.subject} · Sent <LocalTime iso={c.startedAt ?? c.$createdAt} />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Recipients" value={formatNumber(r.sent)} note={`sent, of ${formatNumber(audience)} in the audience`} />
        <Kpi label="Open rate" value={pct(r.uniqueOpens, base)} note={plural(r.uniqueOpens, "person", "people") + " opened"} />
        <Kpi label="Click rate" value={pct(r.uniqueClicks, base)} note={plural(r.uniqueClicks, "person", "people") + " clicked"} />
        <Kpi label="Click-to-open rate" value={pct(r.uniqueClicks, r.uniqueOpens)} note="of the people who opened" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
            <CardDescription>
              Opens are an estimate: some email apps load images by themselves, and some block them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar label="Sent" value={r.sent} base={r.sent} />
            {r.delivered > 0 && <Bar label="Delivered" value={r.delivered} base={r.sent} />}
            <Bar label="Opened" value={r.uniqueOpens} base={r.sent}>
              <p className="text-[11px] text-muted-foreground">{plural(r.totalOpens, "open")} in total</p>
            </Bar>
            <Bar label="Clicked" value={r.uniqueClicks} base={r.sent}>
              <p className="text-[11px] text-muted-foreground">{plural(r.totalClicks, "click")} in total</p>
            </Bar>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery and list health</CardTitle>
            <CardDescription>High bounce or complaint rates send your next emails to spam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {[
              { label: "Bounced", value: r.bounces, rate: pct(r.bounces, r.sent), bad: bounceRate > MAX_BOUNCE_RATE },
              { label: "Marked as spam", value: r.complaints, rate: pct(r.complaints, r.sent), bad: complaintRate > MAX_COMPLAINT_RATE },
              { label: "Unsubscribed", value: r.unsubscribes, rate: pct(r.unsubscribes, base), bad: false },
              { label: "Not sent (failed or skipped)", value: r.failed + r.skipped, rate: pct(r.failed + r.skipped, audience), bad: false },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span>{row.label}</span>
                <span className={cn("tabular-nums", row.bad ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {formatNumber(row.value)} · {row.rate}
                </span>
              </div>
            ))}
            {bounceRate > MAX_BOUNCE_RATE && (
              <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                More than 2% bounced. Remove old or bought addresses before your next campaign.
              </p>
            )}
            {complaintRate > MAX_COMPLAINT_RATE && (
              <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                More than 0.1% marked the email as spam. Send only to people who asked for your emails.
              </p>
            )}
            {r.queued > 0 && <p className="text-muted-foreground">{plural(r.queued, "email")} still waiting to be sent.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>Which links people clicked. One person can click more than once.</CardDescription>
        </CardHeader>
        <CardContent>
          {r.links.length === 0 ? (
            <p className="text-xs text-muted-foreground">This email has no tracked links.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Link</TableHead>
                  <TableHead className="w-24 text-right text-xs">Clicks</TableHead>
                  <TableHead className="w-24 text-right text-xs">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.links.map((l) => (
                  <TableRow key={l.url}>
                    <TableCell className="max-w-md truncate text-xs">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline" title={l.url}>
                        {l.url}
                      </a>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatNumber(l.clicks)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{pct(l.clicks, totalLinkClicks)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="recipients" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>See who opened and clicked. Click an email to open the contact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <nav className="flex flex-wrap gap-1" aria-label="Filter recipients">
            {RECIPIENT_FILTERS.map((f) => (
              <Link
                key={f}
                href={href(f)}
                scroll={false}
                aria-current={f === filter ? "page" : undefined}
                className={cn(buttonVariants({ variant: f === filter ? "secondary" : "ghost", size: "xs" }))}
              >
                {FILTER_LABEL[f]}
                <span className="tabular-nums text-muted-foreground">{formatNumber(counts[f])}</span>
              </Link>
            ))}
          </nav>

          {recipients.rows.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No recipients in this group.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Opened</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Clicked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.rows.map((m) => (
                  <TableRow key={m.$id}>
                    <TableCell className="max-w-64 truncate text-xs">
                      <Link href={`/contacts/${m.contactId}`} className="font-medium hover:underline">
                        {m.email}
                      </Link>
                      {m.name && <span className="ml-1.5 text-muted-foreground">{m.name}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.status === "failed" ? "destructive" : "outline"}
                        className="font-normal"
                        title={m.error ?? undefined}
                      >
                        {MESSAGE_STATUS[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      <LocalTime iso={m.openedAt} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      <LocalTime iso={m.clickedAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {recipients.total > RECIPIENT_PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                Page {page} of {pages}
              </span>
              <div className="flex gap-1">
                {page > 1 ? (
                  <Button variant="outline" size="icon-sm" render={<Link href={href(filter, page - 1)} scroll={false} aria-label="Previous page" />}>
                    <ChevronLeft />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon-sm" disabled aria-label="Previous page">
                    <ChevronLeft />
                  </Button>
                )}
                {page < pages ? (
                  <Button variant="outline" size="icon-sm" render={<Link href={href(filter, page + 1)} scroll={false} aria-label="Next page" />}>
                    <ChevronRight />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon-sm" disabled aria-label="Next page">
                    <ChevronRight />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

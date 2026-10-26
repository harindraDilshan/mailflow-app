import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, BarChart3, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocalTime } from "@/components/local-time";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { requireUser } from "@/lib/auth";
import { campaignStats, countMessages, getOwnedCampaign, reviewCampaign, type CampaignChecks } from "@/lib/campaigns";
import { isSendingStatus } from "@/lib/campaign-status";
import { listOwnedLists } from "@/lib/contacts";
import { extractLinks } from "@/lib/email/render";
import { formatNumber, plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignActions, CancelScheduleButton, SendPanel } from "./campaign-controls";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl space-y-6" aria-busy aria-label="Loading campaign">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-10 w-96" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-[640px] lg:col-span-3" />
          </div>
        </div>
      }
    >
      <CampaignContent params={params} />
    </Suspense>
  );
}

const rate = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "—");

async function CampaignContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  const beforeSend = c.status === "draft" || c.status === "scheduled";
  const [lists, review, progress, stats] = await Promise.all([
    listOwnedLists(user.$id),
    beforeSend ? reviewCampaign(user.$id, c) : null,
    beforeSend
      ? null
      : Promise.all(["queued", "sent", "failed", "skipped"].map((s) => countMessages(c.$id, s))),
    beforeSend ? null : campaignStats(c.$id),
  ]);

  const names = (c.listIds ?? []).map((lid) => lists.find((l) => l.$id === lid)?.name).filter(Boolean);
  const audienceLabel = (c.listIds ?? []).length === 0 ? "All active contacts" : names.join(", ") || "Lists that were deleted";
  const blocked = !user.emailVerification
    ? "Verify your account email before you send campaigns."
    : (review?.issues[0] ?? null);

  return (
    <div className="max-w-6xl space-y-6">
      <AutoRefresh active={isSendingStatus(c.status)} />

      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/campaigns" />}>
          <ArrowLeft />
          Campaigns
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{c.name}</h1>
              <CampaignStatusBadge status={c.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Created <LocalTime iso={c.$createdAt} /> · Last changed <LocalTime iso={c.$updatedAt} />
            </p>
          </div>
          <CampaignActions campaign={{ id: c.$id, name: c.name, status: c.status }} />
        </div>
      </div>

      {/* ----- what is happening now ----- */}
      {c.status === "scheduled" && (
        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 text-sky-600 dark:text-sky-400" />
              <div className="text-sm">
                <p className="font-medium">
                  Scheduled for <LocalTime iso={c.scheduledAt} />
                </p>
                <p className="text-xs text-muted-foreground">
                  The recipients are counted again at that time. To change the campaign, cancel the schedule first.
                </p>
              </div>
            </div>
            <CancelScheduleButton campaignId={c.$id} />
          </CardContent>
        </Card>
      )}

      {progress && stats && <SendingSummary status={c.status} counts={progress} stats={stats} campaignId={c.$id} />}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {c.status === "draft" && review && (
            <SendPanel
              campaign={{ id: c.$id, name: c.name }}
              audience={review.audience}
              blocked={blocked}
              userEmail={user.email}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>{c.status === "draft" ? "Checklist" : "Details"}</CardTitle>
              {c.status === "draft" && <CardDescription>Everything must be green before you can send.</CardDescription>}
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <Check title="To" issue={review?.checks.audience} edit={editHref(c, "audience")}>
                {audienceLabel}
                {review && <span className="block text-muted-foreground">{plural(review.audience, "active contact")} now</span>}
              </Check>
              <Check title="From" issue={review?.checks.sender} edit={editHref(c, "sender")}>
                {c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail}
                {c.replyTo && <span className="block text-muted-foreground">Replies to {c.replyTo}</span>}
              </Check>
              <Check title="Subject" issue={review?.checks.subject} edit={editHref(c, "subject")}>
                {c.subject}
                {c.previewText ? (
                  <span className="block text-muted-foreground">{c.previewText}</span>
                ) : (
                  beforeSend && (
                    <span className="block text-amber-700 dark:text-amber-400">
                      Tip: add preview text to show a summary in the inbox.
                    </span>
                  )
                )}
              </Check>
              <Check title="Content" issue={review?.checks.content} edit={editHref(c, "content")}>
                {plural(extractLinks(c.html).length, "link")} · unsubscribe link added by Mailflow
              </Check>
              {review?.checks.limit && <Check title="Daily limit" issue={review.checks.limit} />}
              {c.status === "draft" && !user.emailVerification && (
                <Check title="Your account" issue="Verify your account email. Use the link in the email we sent you." />
              )}
              {c.startedAt && (
                <Check title="Sending">
                  Started <LocalTime iso={c.startedAt} />
                  {c.finishedAt && (
                    <span className="block text-muted-foreground">
                      Finished <LocalTime iso={c.finishedAt} />
                    </span>
                  )}
                </Check>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <EmailPreview html={c.html} subject={c.subject} previewText={c.previewText} fromName={c.fromName} fromEmail={c.fromEmail} />
        </div>
      </div>
    </div>
  );
}

const editHref = (c: { $id: string; status: string }, section: keyof CampaignChecks) =>
  c.status === "draft" ? `/campaigns/${c.$id}/edit#${section}` : undefined;

// One line of the checklist. Without `issue` (undefined) it is a plain detail line.
function Check({ title, issue, edit, children }: { title: string; issue?: string | null; edit?: string; children?: ReactNode }) {
  const checked = issue !== undefined;
  return (
    <div className="flex items-start gap-3 py-3 text-xs first:pt-0 last:pb-0">
      {checked &&
        (issue ? (
          <AlertCircle className="mt-px size-4 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="mt-px size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ))}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-medium">{title}</div>
        {children && <div className="break-words">{children}</div>}
        {issue && <div className="text-destructive">{issue}</div>}
      </div>
      {edit && (
        <Link href={edit} className="shrink-0 text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Edit
        </Link>
      )}
    </div>
  );
}

// Progress while sending, and the result after.
function SendingSummary({
  status,
  counts,
  stats,
  campaignId,
}: {
  status: string;
  counts: number[];
  stats: { sent: number; opened: number; clicked: number };
  campaignId: string;
}) {
  const [queued, sent, failed, skipped] = counts;
  const total = queued + sent + failed + skipped;
  const done = sent + failed + skipped;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const sending = isSendingStatus(status);

  const tiles: { label: string; value: string; note?: string }[] = sending
    ? [
        { label: "Recipients", value: formatNumber(total) },
        { label: "Sent", value: formatNumber(sent) },
        { label: "Waiting", value: formatNumber(queued) },
        { label: "Not sent", value: formatNumber(failed + skipped) },
      ]
    : [
        { label: "Sent", value: formatNumber(sent), note: `of ${formatNumber(total)} recipients` },
        { label: "Opened", value: rate(stats.opened, stats.sent), note: plural(stats.opened, "person", "people") },
        { label: "Clicked", value: rate(stats.clicked, stats.sent), note: plural(stats.clicked, "person", "people") },
        { label: "Not sent", value: formatNumber(failed + skipped), note: "failed or skipped" },
      ];

  return (
    <Card>
      <CardContent className="space-y-4">
        {status === "failed" && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            <XCircle className="mt-px size-3.5 shrink-0" />
            Sending failed. Use More → Duplicate to make a new draft and send it again.
          </p>
        )}
        {sending && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{status === "queued" ? "Preparing the recipients..." : "Sending..."}</span>
              <span className="tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <Progress value={percent} aria-label="Sending progress" />
            <p className="text-[11px] text-muted-foreground">This page updates by itself.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-border p-3">
              <div className="text-[11px] text-muted-foreground">{t.label}</div>
              <div className="text-lg font-semibold tabular-nums">{t.value}</div>
              {t.note && <div className="text-[11px] text-muted-foreground">{t.note}</div>}
            </div>
          ))}
        </div>
        {!sending && (
          <Button size="sm" variant="outline" render={<Link href={`/campaigns/${campaignId}/report`} />}>
            <BarChart3 />
            View the full report
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

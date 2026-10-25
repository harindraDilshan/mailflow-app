import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { requireUser } from "@/lib/auth";
import { getOwnedCampaign } from "@/lib/campaigns";
import { getCampaignReport } from "@/lib/reports";

const pct = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "–");

function MetricCard({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs font-medium text-foreground">{label}</div>
      {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading campaign report...
        </div>
      }
    >
      <ReportContent params={params} />
    </Suspense>
  );
}

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  if (c.status === "draft") {
    return (
      <p className="text-xs text-muted-foreground">
        This campaign has not been sent yet.{" "}
        <Link href={`/campaigns/${c.$id}`} className="underline">
          Back
        </Link>
      </p>
    );
  }

  const r = await getCampaignReport(c);
  const total = r.sent + r.failed + r.skipped + r.queued;
  const base = r.delivered > 0 ? r.delivered : r.sent;
  const baseLabel = r.delivered > 0 ? "of delivered" : "of sent";
  const maxClicks = Math.max(1, ...r.links.map((l) => l.clicks));

  return (
    <div className="max-w-3xl space-y-6">
      <AutoRefresh active={c.status === "sending" || c.status === "queued"} />
      <div>
        <Link href={`/campaigns/${c.$id}`} className="text-xs text-muted-foreground hover:underline">
          ← Back to campaign
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{c.name}</h1>
        <p className="text-xs text-muted-foreground">Subject: {c.subject}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Sent" value={r.sent} note={`${pct(r.sent, total)} of audience`} />
        <MetricCard label="Delivered" value={r.delivered} note={`${pct(r.delivered, r.sent)} of sent`} />
        <MetricCard label="Opened" value={r.uniqueOpens} note={`${pct(r.uniqueOpens, base)} ${baseLabel}`} />
        <MetricCard label="Clicked" value={r.uniqueClicks} note={`${pct(r.uniqueClicks, base)} ${baseLabel}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Bounced" value={r.bounces} note={pct(r.bounces, r.sent)} />
        <MetricCard label="Complaints" value={r.complaints} note={pct(r.complaints, r.sent)} />
        <MetricCard label="Unsubscribed" value={r.unsubscribes} note={pct(r.unsubscribes, base)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-foreground">Links clicked</h2>
        {r.links.length === 0 && (
          <p className="text-xs text-muted-foreground">No links tracked in this email.</p>
        )}
        <div className="space-y-2">
          {r.links.map((l) => {
            const width = Math.round((l.clicks / maxClicks) * 100);
            return (
              <div key={l.url} className="rounded-lg border border-border p-3 text-xs">
                <div className="flex justify-between gap-4">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="break-all font-mono hover:underline">
                    {l.url}
                  </a>
                  <span className="font-semibold whitespace-nowrap">{l.clicks} clicks</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

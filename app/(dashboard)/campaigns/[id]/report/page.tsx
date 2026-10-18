import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { requireUser } from "@/lib/auth";
import { getOwnedCampaign } from "@/lib/campaigns";
import { getCampaignReport } from "@/lib/reports";

const pct = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "–");

function Card({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm">{label}</div>
      {note && <div className="text-xs text-gray-500">{note}</div>}
    </div>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  if (c.status === "draft") {
    return <p>This campaign has not been sent yet. <Link href={`/campaigns/${c.$id}`} className="underline">Back</Link></p>;
  }

  const r = await getCampaignReport(c);
  const base = r.delivered > 0 ? r.delivered : r.sent;
  const baseLabel = r.delivered > 0 ? "of delivered" : "of sent";
  const maxClicks = Math.max(1, ...r.links.map((l) => l.clicks));

  return (
    <div className="max-w-3xl">
      <AutoRefresh active={c.status === "queued" || c.status === "sending"} />
      <Link href={`/campaigns/${c.$id}`} className="text-sm underline">← {c.name}</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Report: {c.name}</h1>
      <p className="mb-6 text-sm text-gray-600">Subject: {c.subject}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Sent" value={r.sent} />
        <Card label="Delivered" value={r.delivered} note={pct(r.delivered, r.sent) + " of sent"} />
        <Card label="Opened" value={r.uniqueOpens} note={`${pct(r.uniqueOpens, base)} ${baseLabel}`} />
        <Card label="Clicked" value={r.uniqueClicks} note={`${pct(r.uniqueClicks, base)} ${baseLabel}`} />
        <Card label="Bounced" value={r.bounces} note={pct(r.bounces, r.sent) + " of sent"} />
        <Card label="Spam complaints" value={r.complaints} note={pct(r.complaints, r.sent) + " of sent"} />
        <Card label="Unsubscribed" value={r.unsubscribes} note={pct(r.unsubscribes, base) + ` ${baseLabel}`} />
        <Card label="Failed to send" value={r.failed} />
        <Card label="Skipped" value={r.skipped} note="unsubscribed before sending" />
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Total opens: {r.totalOpens} · Total clicks: {r.totalClicks} (the cards above count each person once).
      </p>

      <h2 className="mb-2 mt-8 font-medium">Links</h2>
      <table className="w-full border text-left text-sm">
        <thead>
          <tr className="bg-gray-50"><th className="p-2">Link</th><th className="p-2 w-28">Clicks</th></tr>
        </thead>
        <tbody>
          {r.links.length === 0 && (
            <tr><td colSpan={2} className="p-3 text-gray-500">This email has no links.</td></tr>
          )}
          {r.links.map((l) => (
            <tr key={l.url} className="border-t">
              <td className="p-2">
                <div className="break-all">{l.url}</div>
                <div className="mt-1 h-1.5 rounded bg-gray-200">
                  <div className="h-1.5 rounded bg-black" style={{ width: `${(l.clicks / maxClicks) * 100}%` }} />
                </div>
              </td>
              <td className="p-2">{l.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 rounded border bg-yellow-50 p-3 text-xs text-gray-700">
        <b>About these numbers.</b> Open tracking is not 100% exact. Some mail apps load images
        automatically (for example, Apple Mail Privacy Protection), which counts opens that did not
        happen. Other people block images, so real opens are missed. A click also counts as an open.
        Some security tools click links automatically too. Use the numbers to compare campaigns,
        not as exact counts. Clicks are more reliable than opens.
      </div>
    </div>
  );
}
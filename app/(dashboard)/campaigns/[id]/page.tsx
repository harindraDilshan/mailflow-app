import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { requireUser } from "@/lib/auth";
import { countMessages, getOwnedCampaign, reviewCampaign } from "@/lib/campaigns";
import { sendCampaign } from "../actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LABEL: Record<string, string> = {
  draft: "Draft", queued: "Preparing", sending: "Sending", sent: "Done", failed: "Failed",
};

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading campaign details...
        </div>
      }
    >
      <CampaignContent params={params} />
    </Suspense>
  );
}

async function CampaignContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  const isDraft = c.status === "draft";
  const review = isDraft ? await reviewCampaign(user.$id, c) : null;
  const issues = [...(review?.issues ?? [])];
  if (isDraft && !user.emailVerification) issues.push("Verify your email first.");

  const [queued, sent, failed, skipped] = isDraft
    ? [0, 0, 0, 0]
    : await Promise.all([
        countMessages(c.$id, "queued"),
        countMessages(c.$id, "sent"),
        countMessages(c.$id, "failed"),
        countMessages(c.$id, "skipped"),
      ]);
  const total = queued + sent + failed + skipped;
  const done = sent + failed + skipped;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <AutoRefresh active={c.status === "queued" || c.status === "sending"} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{c.name}</h1>
        <Badge variant={c.status === "sent" ? "default" : "outline"}>
          {LABEL[c.status] ?? c.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Subject: {c.subject} · From: {c.fromEmail}
      </p>

      {isDraft && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-foreground">
            Audience: <b>{review?.audience ?? 0}</b> contacts
          </p>
          {issues.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-destructive space-y-1">
              {issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Everything is configured.</p>
          )}
          <form action={sendCampaign}>
            <input type="hidden" name="id" value={c.$id} />
            <Button type="submit" disabled={issues.length > 0} size="sm">
              Send Now
            </Button>
          </form>
        </div>
      )}

      {!isDraft && (
        <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
            <div>Total: <span className="font-mono font-medium">{total}</span></div>
            <div>Sent: <span className="font-mono font-medium">{sent}</span></div>
            <div>Waiting: <span className="font-mono font-medium">{queued}</span></div>
            <div>Failed: <span className="font-mono font-medium">{failed}</span></div>
          </div>
          <p className="pt-2 border-t border-border">
            <Link href={`/campaigns/${c.$id}/report`} className="text-foreground hover:underline font-medium">
              View full report →
            </Link>
          </p>
          {c.status === "queued" && <p className="text-muted-foreground">Preparing recipients list...</p>}
        </div>
      )}
    </div>
  );
}

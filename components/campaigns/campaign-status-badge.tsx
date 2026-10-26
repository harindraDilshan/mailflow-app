import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { campaignStatusMeta } from "@/lib/campaign-status";

const DOT: Record<string, string> = {
  draft: "bg-zinc-400",
  scheduled: "bg-sky-500",
  queued: "bg-amber-500 animate-pulse",
  sending: "bg-amber-500 animate-pulse",
  sent: "bg-emerald-500",
  failed: "bg-red-500",
};

export function CampaignStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = campaignStatusMeta(status);
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)} title={meta.description}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status] ?? "bg-zinc-400")} />
      {meta.label}
    </Badge>
  );
}

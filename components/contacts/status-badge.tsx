import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusMeta, type StatusTone } from "@/lib/contact-status";

const DOT: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-zinc-400",
  muted: "bg-zinc-300 dark:bg-zinc-600",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)} title={meta.description}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[meta.tone])} />
      {meta.label}
    </Badge>
  );
}

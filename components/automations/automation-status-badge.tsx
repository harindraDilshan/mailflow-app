import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LOOK: Record<string, { label: string; dot: string; title: string }> = {
  draft: { label: "Draft", dot: "bg-zinc-400", title: "Not on yet. Nobody enters it." },
  active: { label: "On", dot: "bg-emerald-500 animate-pulse", title: "People who match the trigger enter it." },
  paused: { label: "Paused", dot: "bg-amber-500", title: "Nobody enters, and nobody moves forward." },
};

export function AutomationStatusBadge({ status, className }: { status: string; className?: string }) {
  const look = LOOK[status] ?? { label: status, dot: "bg-zinc-400", title: "" };
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)} title={look.title}>
      <span aria-hidden className={cn("size-1.5 rounded-full", look.dot)} />
      {look.label}
    </Badge>
  );
}

import Link from "next/link";
import { GitBranch, ListChecks } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// "Workflow | Activity" links at the top of one automation.
export function AutomationNav({ id, active }: { id: string; active: "workflow" | "activity" }) {
  const item = (key: "workflow" | "activity", href: string, label: string, Icon: typeof GitBranch) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(buttonVariants({ variant: active === key ? "secondary" : "ghost", size: "sm" }))}
    >
      <Icon />
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center gap-1" aria-label="Automation sections">
      {item("workflow", `/automations/${id}`, "Workflow", GitBranch)}
      {item("activity", `/automations/${id}/activity`, "Activity", ListChecks)}
    </nav>
  );
}

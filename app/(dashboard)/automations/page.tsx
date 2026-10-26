import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import {
  AUTOMATION_PAGE_SIZE, AUTOMATION_STATUSES, automationTotals, countAutomationsByStatus, searchAutomations,
} from "@/lib/automations";
import { flowOf } from "@/lib/automation-flow";
import { MAX_AUTOMATIONS } from "@/lib/automation-rules";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AutomationsView, type AutomationItem } from "./automations-view";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default function AutomationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Automations</h1>
          <p className="text-xs text-muted-foreground">
            Workflows that send emails and update contacts by themselves, when a person joins a list or gets a tag
          </p>
        </div>
        <Button size="sm" render={<Link href="/automations/new" />}>
          <Plus />
          New automation
        </Button>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AutomationsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AutomationsContent({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const status = one(raw.status);
  const view = {
    q: one(raw.q),
    status: status && (AUTOMATION_STATUSES as readonly string[]).includes(status) ? status : undefined,
    page: Math.max(1, parseInt(one(raw.page) ?? "1", 10) || 1),
  };

  const user = await requireUser();
  const [result, counts, lists] = await Promise.all([
    searchAutomations(user.$id, view),
    countAutomationsByStatus(user.$id, view.q),
    listOwnedLists(user.$id),
  ]);
  const totals = await Promise.all(result.rows.map((a) => automationTotals(a.$id)));
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  const rows: AutomationItem[] = result.rows.map((a, i) => ({
    id: a.$id,
    name: a.name,
    status: a.status,
    trigger:
      a.triggerType === "list_joined"
        ? `When someone joins "${listName.get(a.triggerValue) ?? "a deleted list"}"`
        : `When the tag "${a.triggerValue}" is added`,
    steps: flowOf(a).nodes.length - 1,
    active: totals[i].active,
    completed: totals[i].completed,
    sent: totals[i].sent,
    updatedAt: a.$updatedAt,
  }));

  return (
    <div className="space-y-2">
      <AutomationsView view={view} rows={rows} total={result.total} counts={counts} pageSize={AUTOMATION_PAGE_SIZE} />
      <p className="text-[11px] text-muted-foreground">
        {counts.all} of {MAX_AUTOMATIONS} automations used.
      </p>
    </div>
  );
}

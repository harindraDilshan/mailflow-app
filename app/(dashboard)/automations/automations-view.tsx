"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Copy, GitBranch, ListChecks, Loader2, MoreHorizontal, Pause, Play, Plus, Search, SearchX,
  Trash2, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DebouncedInput } from "@/components/debounced-input";
import { LocalTime } from "@/components/local-time";
import { AutomationStatusBadge } from "@/components/automations/automation-status-badge";
import { useConfirm } from "@/components/confirm-dialog";
import { runAction } from "@/components/run-action";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteAutomation, duplicateAutomation, setAutomationStatus } from "./actions";

export type AutomationsListView = { q?: string; status?: string; page: number };
export type AutomationItem = {
  id: string;
  name: string;
  status: string;
  trigger: string;
  steps: number;
  active: number;
  completed: number;
  sent: number;
  updatedAt: string;
};

const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "On" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Drafts" },
] as const;

export function AutomationsView({
  view,
  rows,
  total,
  counts,
  pageSize,
}: {
  view: AutomationsListView;
  rows: AutomationItem[];
  total: number;
  counts: Record<"all" | "draft" | "active" | "paused", number>;
  pageSize: number;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [acting, startAction] = useTransition();
  const [shown, setShown] = useOptimistic(view);
  const [confirmDialog, confirm] = useConfirm();

  function navigate(patch: Partial<AutomationsListView>, opts?: { replace?: boolean }) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === 1) params.delete(k);
      else params.set(k, String(v));
    }
    if (!("page" in patch)) params.delete("page");
    const qs = params.toString();
    startNavigation(() => {
      setShown((cur) => ({ ...cur, ...patch, page: patch.page ?? 1 }));
      const url = qs ? `/automations?${qs}` : "/automations";
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const noAutomations = counts.all === 0 && !view.q;

  return (
    <div className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs value={shown.status ?? "all"} onValueChange={(v) => navigate({ status: v === "all" ? undefined : String(v) })}>
          <TabsList variant="line" aria-label="Filter by status">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-none px-2 text-xs">
                {t.label}
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-normal text-muted-foreground tabular-nums">
                  {formatNumber(counts[t.value])}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-full sm:w-72">
          <DebouncedInput
            value={view.q ?? ""}
            onCommit={(q) => navigate({ q: q || undefined }, { replace: true })}
            icon={<Search />}
            clearable
            placeholder="Search by name"
            aria-label="Search automations"
            className="h-8 text-xs"
          />
        </div>
        {(navigating || acting) && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
              {noAutomations ? <Workflow className="size-5 text-muted-foreground" /> : <SearchX className="size-5 text-muted-foreground" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-medium">{noAutomations ? "No automations yet" : "No automations match this view"}</h2>
              <p className="max-w-sm text-xs text-muted-foreground">
                {noAutomations
                  ? "An automation sends the right emails at the right time, by itself: welcome series, follow-ups, and more."
                  : "Try another tab or other words."}
              </p>
            </div>
            {noAutomations ? (
              <Button size="sm" render={<Link href="/automations/new" />}>
                <Plus />
                Create your first automation
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate({ q: undefined, status: undefined })}>
                Show all automations
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          aria-busy={navigating}
          className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-opacity", navigating && "opacity-60")}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs">Automation</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">Steps</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">In progress</TableHead>
                <TableHead className="hidden text-right text-xs lg:table-cell">Finished</TableHead>
                <TableHead className="hidden text-right text-xs lg:table-cell">Emails sent</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Changed</TableHead>
                <TableHead className="w-10 pr-3">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-80 pl-4">
                    <Link href={`/automations/${a.id}`} className="block truncate text-sm font-medium hover:underline">
                      {a.name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{a.trigger}</div>
                  </TableCell>
                  <TableCell>
                    <AutomationStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="hidden text-right text-xs tabular-nums md:table-cell">{a.steps}</TableCell>
                  <TableCell className="hidden text-right text-xs tabular-nums md:table-cell">{formatNumber(a.active)}</TableCell>
                  <TableCell className="hidden text-right text-xs tabular-nums lg:table-cell">{formatNumber(a.completed)}</TableCell>
                  <TableCell className="hidden text-right text-xs tabular-nums lg:table-cell">{formatNumber(a.sent)}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    <LocalTime iso={a.updatedAt} dateOnly />
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${a.name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem render={<Link href={`/automations/${a.id}`} />}>
                          <GitBranch />
                          Open workflow
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`/automations/${a.id}/activity`} />}>
                          <ListChecks />
                          Activity
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {a.status === "active" ? (
                          <DropdownMenuItem onClick={() => startAction(async () => void (await runAction(setAutomationStatus, { id: a.id, to: "paused" })))}>
                            <Pause />
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => startAction(async () => void (await runAction(setAutomationStatus, { id: a.id, to: "active" })))}>
                            <Play />
                            {a.status === "paused" ? "Resume" : "Turn on"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            startAction(async () => {
                              const res = await runAction(duplicateAutomation, { id: a.id });
                              if (res?.ok && res.id) router.push(`/automations/${res.id}`);
                            })
                          }
                        >
                          <Copy />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            confirm({
                              title: `Delete "${a.name}"?`,
                              description: "People who are in it now leave at their next step. Its results are deleted. You cannot undo this.",
                              confirmLabel: "Delete automation",
                              destructive: true,
                              onConfirm: () => runAction(deleteAutomation, { id: a.id }),
                            })
                          }
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > 0 && pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            Page {view.page} of {pages} · {plural(total, "automation")}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={view.page <= 1} onClick={() => navigate({ page: view.page - 1 })} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={view.page >= pages} onClick={() => navigate({ page: view.page + 1 })} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

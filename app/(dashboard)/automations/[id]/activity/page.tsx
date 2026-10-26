import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { automationTotals, getOwnedAutomation, nodeStats, recentRuns } from "@/lib/automations";
import { flowOf, keyOf, type FlowNode } from "@/lib/automation-flow";
import { formatNumber } from "@/lib/format";
import { LocalTime } from "@/components/local-time";
import { AutomationNav } from "@/components/automations/automation-nav";
import { AutomationStatusBadge } from "@/components/automations/automation-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stepSummary, stepTitle } from "../../builder/step-meta";

const EXIT_REASON: Record<string, string> = {
  automation_deleted: "The automation was deleted",
  contact_deleted: "The contact was deleted",
  contact_unsubscribed: "Unsubscribed",
  contact_bounced: "An email bounced",
  contact_complained: "Marked an email as spam",
  contact_archived: "The contact was archived",
  left_trigger: "Left the list or lost the tag",
  email_rejected: "An email was rejected",
};

const RUN_STATUS: Record<string, { label: string; variant: "secondary" | "outline" }> = {
  active: { label: "In progress", variant: "secondary" },
  completed: { label: "Finished", variant: "outline" },
  exited: { label: "Left early", variant: "outline" },
};

const pct = (n = 0, base = 0) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "—");

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl space-y-6" aria-busy aria-label="Loading activity">
          <Skeleton className="h-8 w-80" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      }
    >
      <ActivityContent params={params} />
    </Suspense>
  );
}

async function ActivityContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, id);
  if (!a) notFound();

  const flow = flowOf(a);
  const [lists, totals, runs, stats] = await Promise.all([
    listOwnedLists(user.$id),
    automationTotals(a.$id),
    recentRuns(a.$id),
    nodeStats(a.$id, flow),
  ]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));
  const emailName = new Map(
    flow.nodes.filter((n) => n.type === "email").map((n) => [n.id, (n.type === "email" && n.data.subject) || "Email"])
  );
  const names = { list: (lid: string) => listName.get(lid), email: (eid: string) => emailName.get(eid) };
  const stepAt = (key: number) => flow.nodes.find((n) => n.type !== "trigger" && keyOf(n.id) === key);
  const emails = flow.nodes.filter((n): n is Extract<FlowNode, { type: "email" }> => n.type === "email");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/automations" />}>
          <ArrowLeft />
          Automations
        </Button>
        <h1 className="max-w-64 truncate text-base font-semibold tracking-tight">{a.name}</h1>
        <AutomationStatusBadge status={a.status} />
        <AutomationNav id={a.$id} active="activity" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "In progress", value: totals.active, note: "people in it now" },
          { label: "Finished", value: totals.completed, note: "reached the end" },
          { label: "Left early", value: totals.exited, note: "unsubscribed, left the trigger, …" },
          { label: "Emails sent", value: totals.sent, note: "by all email steps" },
        ].map((k) => (
          <Card key={k.label} size="sm">
            <CardContent>
              <div className="text-[11px] text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(k.value)}</div>
              <div className="text-[11px] text-muted-foreground">{k.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emails</CardTitle>
          <CardDescription>Results of each email step. Compare the paths of an A/B split here.</CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-xs text-muted-foreground">This automation has no email steps.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-right text-xs">Sent</TableHead>
                  <TableHead className="text-right text-xs">Opened</TableHead>
                  <TableHead className="text-right text-xs">Clicked</TableHead>
                  <TableHead className="hidden text-right text-xs sm:table-cell">Here now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((n) => {
                  const s = stats[n.id];
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-72 truncate text-xs font-medium">{n.data.subject || "No subject"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatNumber(s?.sent ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{pct(s?.opened, s?.sent)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{pct(s?.clicked, s?.sent)}</TableCell>
                      <TableCell className="hidden text-right text-xs text-muted-foreground tabular-nums sm:table-cell">
                        {formatNumber(s?.waiting ?? 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>The last {runs.length} people who entered. Click an email to open the contact.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nobody has entered yet. People enter when they match the trigger after you turn the automation on.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="hidden text-xs md:table-cell">Step</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Entered</TableHead>
                  <TableHead className="hidden text-xs lg:table-cell">Next / reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const step = stepAt(r.stepIndex);
                  const status = RUN_STATUS[r.status] ?? { label: r.status, variant: "outline" as const };
                  return (
                    <TableRow key={r.$id}>
                      <TableCell className="max-w-56 truncate text-xs">
                        <Link href={`/contacts/${r.contactId}`} className="font-medium hover:underline">
                          {r.email ?? "Contact"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="font-normal">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-xs md:table-cell">
                        {r.status !== "active" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : step ? (
                          <>
                            <span className="font-medium">{stepTitle(step)}</span>
                            <span className="text-muted-foreground"> · {stepSummary(step, names)}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">A deleted step</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        <LocalTime iso={r.$createdAt} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {r.status === "active" ? (
                          <LocalTime iso={r.nextRunAt} />
                        ) : r.status === "exited" ? (
                          (EXIT_REASON[r.exitReason ?? ""] ?? r.exitReason ?? "—")
                        ) : (
                          <LocalTime iso={r.completedAt} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

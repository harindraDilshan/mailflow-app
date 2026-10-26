import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { automationTotals, getOwnedAutomation, nodeStats } from "@/lib/automations";
import { flowOf } from "@/lib/automation-flow";
import { senderDomainIssue } from "@/lib/campaigns";
import { isValidEmail } from "@/lib/contact-rules";
import { Skeleton } from "@/components/ui/skeleton";
import { FlowBuilderLoader } from "../builder/flow-builder-loader";

export default function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100dvh-8.5rem)] min-h-[640px] w-full rounded-xl" />}>
      <BuilderContent params={params} />
    </Suspense>
  );
}

async function BuilderContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, id);
  if (!a) notFound();

  const flow = flowOf(a);
  const [lists, totals, domainMessage] = await Promise.all([
    listOwnedLists(user.$id),
    automationTotals(a.$id),
    isValidEmail(a.fromEmail) ? senderDomainIssue(user.$id, a.fromEmail) : Promise.resolve(null),
  ]);
  // The live numbers on the steps. Not needed before anybody has entered.
  const stats = totals.active + totals.completed + totals.exited > 0 ? await nodeStats(a.$id, flow) : null;

  return (
    <FlowBuilderLoader
      automation={{ id: a.$id, name: a.name, status: a.status, fromName: a.fromName ?? "", fromEmail: a.fromEmail }}
      flow={flow}
      lists={lists.map((l) => ({ id: l.$id, name: l.name }))}
      stats={stats}
      domainIssue={domainMessage ? { email: a.fromEmail, message: domainMessage } : null}
      canActivate={Boolean(user.emailVerification)}
    />
  );
}

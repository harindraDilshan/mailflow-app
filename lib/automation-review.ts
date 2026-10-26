import { listOwnedLists } from "@/lib/contacts";
import { senderDomainIssue } from "@/lib/campaigns";
import { isValidEmail } from "@/lib/contact-rules";
import { flowIssues, flowOf, type FlowIssue } from "@/lib/automation-flow";
import type { AutomationRow } from "@/lib/automations";

// Everything that blocks "Turn on". Each issue names its step when it belongs to one.
export async function reviewAutomation(accountId: string, a: AutomationRow) {
  const flow = flowOf(a);
  const lists = await listOwnedLists(accountId);
  const issues: FlowIssue[] = flowIssues(flow, lists.map((l) => ({ id: l.$id })));

  if (!isValidEmail(a.fromEmail)) {
    issues.push({ message: "Set a valid sender email in the automation settings." });
  } else {
    const domainIssue = await senderDomainIssue(accountId, a.fromEmail);
    if (domainIssue) issues.push({ message: domainIssue });
  }

  return { issues, flow };
}

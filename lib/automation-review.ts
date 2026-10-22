import { getOwnedList } from "@/lib/contacts";
import { senderDomainIssue } from "@/lib/campaigns";
import { isValidEmail } from "@/lib/contact-rules";
import { parseSteps, type EmailStep, type Step } from "@/lib/automation-rules";
import type { AutomationRow } from "@/lib/automations";

export async function reviewAutomation(accountId: string, a: AutomationRow) {
  const issues: string[] = [];

  let steps: Step[] = [];
  try {
    steps = parseSteps(JSON.parse(a.steps)) ?? [];
  } catch {}

  const emails = steps.filter((s): s is EmailStep => s.type === "email");
  if (emails.length === 0) issues.push("Add at least one email step.");
  emails.forEach((s, i) => {
    if (!s.subject.trim()) issues.push(`Email ${i + 1} needs a subject.`);
    if (!s.html.trim()) issues.push(`Email ${i + 1} is empty.`);
    if (/href\s*=\s*["']\s*(javascript|data):/i.test(s.html)) {
      issues.push(`Email ${i + 1} has a link that is not allowed (javascript: or data:).`);
    }
  });
  if (steps.length > 0 && steps[steps.length - 1].type === "wait") {
    issues.push("The last step is a wait. Remove it or add an email after it.");
  }

  if (a.triggerType === "list_joined" && !(await getOwnedList(accountId, a.triggerValue))) {
    issues.push("The list for this trigger no longer exists.");
  }
  if (!isValidEmail(a.fromEmail)) {
    issues.push("Set a valid sender email.");
  } else {
    const domainIssue = await senderDomainIssue(accountId, a.fromEmail);
    if (domainIssue) issues.push(domainIssue);
  }

  return { issues, steps };
}
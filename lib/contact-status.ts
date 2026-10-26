import type { ContactStatus } from "@/lib/contact-rules";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "muted";

export const STATUS_META: Record<ContactStatus, { label: string; description: string; tone: StatusTone }> = {
  active: {
    label: "Active",
    description: "Gets your campaigns and automations.",
    tone: "success",
  },
  pending: {
    label: "Pending",
    description: "Signed up, but did not confirm by email yet. Gets no campaigns until confirmed.",
    tone: "warning",
  },
  unsubscribed: {
    label: "Unsubscribed",
    description: "Asked to stop getting emails. Kept so that this address is never emailed again.",
    tone: "neutral",
  },
  bounced: {
    label: "Bounced",
    description: "This address does not accept email. Kept so that it is never emailed again.",
    tone: "danger",
  },
  complained: {
    label: "Complained",
    description: "Marked one of your emails as spam. Kept so that this address is never emailed again.",
    tone: "danger",
  },
  archived: {
    label: "Archived",
    description: "Hidden from your audience and not counted toward your contact limit. Gets no email.",
    tone: "muted",
  },
};

export function statusMeta(status: string) {
  return STATUS_META[status as ContactStatus] ?? { label: status, description: "", tone: "neutral" as const };
}

// What each status allows. The server actions and the screens use the same rules.
// Pending contacts cannot be archived: unarchive makes a contact active, so it would skip the opt-in.
export const canArchive = (status: string) => status === "active";
export const canUnarchive = (status: string) => status === "archived";
export const canUnsubscribe = (status: string) =>
  status === "active" || status === "pending" || status === "archived";
// Unsubscribed, bounced, and complained contacts stay as a "do not email" record.
export const canDelete = (status: string) =>
  status === "active" || status === "pending" || status === "archived";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Added manually",
  import: "CSV import",
  form: "Embedded form",
  hosted: "Hosted sign-up page",
  api: "API",
};

export const sourceLabel = (source: string) => SOURCE_LABEL[source] ?? source;

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, MailOpen, MousePointerClick, Send } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/contacts/status-badge";
import { requireUser } from "@/lib/auth";
import { getContactActivity, getOwnedContact, listOwnedLists, type ContactActivityItem } from "@/lib/contacts";
import { sourceLabel, statusMeta } from "@/lib/contact-status";
import { formatDate, formatDateTime, formatNumber, initials, plural } from "@/lib/format";
import { updateContact } from "../actions";
import { ContactActions } from "./contact-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ContactSkeleton />}>
      <ContactContent params={params} />
    </Suspense>
  );
}

async function ContactContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, id);
  if (!contact) notFound();

  const [lists, activity] = await Promise.all([
    listOwnedLists(user.$id),
    getContactActivity(user.$id, contact.$id),
  ]);
  const meta = statusMeta(contact.status);

  return (
    <div className="max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts" />}>
        <ArrowLeft />
        Contacts
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials(contact.name, contact.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {contact.name || contact.email}
              </h1>
              <StatusBadge status={contact.status} />
            </div>
            {contact.name && <p className="truncate text-xs text-muted-foreground">{contact.email}</p>}
          </div>
        </div>
        <ContactActions contact={{ id: contact.$id, email: contact.email, status: contact.status }} />
      </div>

      {contact.status !== "active" && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" />
          <p>
            <span className="font-medium text-foreground">{meta.label}.</span> {meta.description}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Name, tags, lists, and a private note. The email address cannot change.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm
                action={updateContact}
                lists={lists.map((l) => ({ id: l.$id, name: l.name }))}
                contact={{
                  id: contact.$id,
                  name: contact.name ?? "",
                  tags: contact.tags ?? [],
                  listIds: contact.listIds ?? [],
                  note: contact.note ?? "",
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email activity</CardTitle>
              <CardDescription>Campaign and automation emails sent to this contact.</CardDescription>
            </CardHeader>
            <CardContent>
              {activity ? (
                <ActivityList activity={activity} />
              ) : (
                <p className="text-xs text-muted-foreground">The email history could not be loaded. Try again later.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-xs">
              <Detail label="Email">
                <span className="break-all">{contact.email}</span>
              </Detail>
              <Detail label="Source">{sourceLabel(contact.source)}</Detail>
              <Detail label="Added">{formatDateTime(contact.$createdAt)}</Detail>
              <Detail label="Consent">
                {contact.consentAt ? formatDateTime(contact.consentAt) : <span className="text-muted-foreground">Not recorded</span>}
              </Detail>
              {contact.consentUrl && (
                <Detail label="Signed up on">
                  <a
                    href={contact.consentUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all underline underline-offset-2 hover:text-foreground"
                  >
                    {contact.consentUrl}
                  </a>
                </Detail>
              )}
              {contact.status === "pending" && (
                <Detail label="Confirmation email">
                  {contact.confirmSentAt ? `Sent ${formatDateTime(contact.confirmSentAt)}` : "Not sent yet"}
                </Detail>
              )}
              {contact.$updatedAt && <Detail label="Last changed">{formatDateTime(contact.$updatedAt)}</Detail>}
              <Detail label="Contact ID">
                <span className="flex items-center gap-2">
                  <code className="truncate font-mono text-[11px]">{contact.$id}</code>
                  <CopyButton text={contact.$id} />
                </span>
              </Detail>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

const MESSAGE_STATUS: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  skipped: "Not sent",
};

function ActivityList({
  activity,
}: {
  activity: { total: number; sent: number; opened: number; clicked: number; items: ContactActivityItem[] };
}) {
  const rate = (n: number) => (activity.sent > 0 ? `${Math.round((n / activity.sent) * 100)}%` : "—");
  const stats = [
    { label: "Sent", value: formatNumber(activity.sent), icon: <Send className="size-3.5" /> },
    { label: "Opened", value: `${formatNumber(activity.opened)} · ${rate(activity.opened)}`, icon: <MailOpen className="size-3.5" /> },
    { label: "Clicked", value: `${formatNumber(activity.clicked)} · ${rate(activity.clicked)}`, icon: <MousePointerClick className="size-3.5" /> },
  ];

  if (activity.total === 0) {
    return <p className="text-xs text-muted-foreground">No emails were sent to this contact yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {s.icon}
              {s.label}
            </div>
            <div className="mt-1 text-sm font-medium tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-border">
        {activity.items.map((m) => {
          const href = m.sourceType === "campaign" ? `/campaigns/${m.sourceId}` : m.sourceType === "automation" ? `/automations/${m.sourceId}` : null;
          return (
            <li key={m.id} className="flex flex-col gap-1.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {href ? (
                  <Link href={href} className="truncate font-medium hover:underline">
                    {m.sourceName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Deleted campaign or automation</span>
                )}
                <div className="text-[11px] text-muted-foreground">
                  {m.sourceType === "automation" ? "Automation" : "Campaign"} · {formatDate(m.sentAt ?? m.createdAt)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.status !== "sent" && (
                  <Badge variant={m.status === "failed" ? "destructive" : "outline"} className="font-normal">
                    {MESSAGE_STATUS[m.status] ?? m.status}
                  </Badge>
                )}
                {m.status === "sent" && !m.openedAt && (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Sent
                  </Badge>
                )}
                {m.openedAt && (
                  <Badge variant="secondary" className="font-normal">
                    Opened
                  </Badge>
                )}
                {m.clickedAt && (
                  <Badge variant="secondary" className="font-normal">
                    Clicked
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {activity.total > activity.items.length && (
        <p className="text-[11px] text-muted-foreground">
          Showing the last {activity.items.length} of {plural(activity.total, "email")}.
        </p>
      )}
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="max-w-5xl space-y-6" aria-busy aria-label="Loading contact">
      <Skeleton className="h-7 w-24" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

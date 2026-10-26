import { Suspense } from "react";
import Link from "next/link";
import { ListFilter, Plus, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { countContacts, countContactsByStatus, listOwnedLists, pageSizeOf, searchContacts } from "@/lib/contacts";
import { MAX_CONTACTS } from "@/lib/contact-rules";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsManager } from "./contacts-manager";
import { parseView, type ContactItem } from "./view";

type SP = Record<string, string | string[] | undefined>;

export default function ContactsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Contacts</h1>
          <p className="text-xs text-muted-foreground">
            Manage your audience, subscriber consent, and segmentation
          </p>
          <Suspense fallback={<Skeleton className="mt-2 h-3 w-48" />}>
            <Usage />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/contacts/lists" />}>
            <ListFilter />
            Lists
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/contacts/import" />}>
            <Upload />
            Import CSV
          </Button>
          <Button size="sm" render={<Link href="/contacts/new" />}>
            <Plus />
            Add contact
          </Button>
        </div>
      </div>

      <Suspense fallback={<ContactsSkeleton />}>
        <ContactsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// "1,234 of 5,000 contacts used" with a thin bar. Archived contacts are not counted.
async function Usage() {
  const user = await requireUser();
  const used = await countContacts(user.$id);
  const percent = Math.min(100, Math.round((used / MAX_CONTACTS) * 100));
  return (
    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn("h-full rounded-full", percent >= 90 ? "bg-destructive" : "bg-primary")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="tabular-nums">
        {formatNumber(used)} of {formatNumber(MAX_CONTACTS)} contacts used
      </span>
    </div>
  );
}

async function ContactsContent({ searchParams }: { searchParams: Promise<SP> }) {
  const view = parseView(await searchParams);
  const user = await requireUser();

  const search = { q: view.q, status: view.status, listId: view.list, tag: view.tag, from: view.from, to: view.to };
  const [lists, result, counts] = await Promise.all([
    listOwnedLists(user.$id),
    searchContacts(user.$id, { ...search, sort: view.sort, page: view.page, pageSize: view.per }),
    countContactsByStatus(user.$id, search),
  ]);

  const rows: ContactItem[] = result.rows.map((c) => ({
    $id: c.$id,
    $createdAt: c.$createdAt,
    email: c.email,
    name: c.name,
    status: c.status,
    source: c.source,
    tags: c.tags ?? [],
    listIds: c.listIds ?? [],
    note: c.note ?? null,
  }));

  return (
    <ContactsManager
      view={view}
      rows={rows}
      total={result.total}
      counts={counts}
      lists={lists.map((l) => ({ id: l.$id, name: l.name }))}
      pageSize={pageSizeOf(view.per)}
    />
  );
}

function ContactsSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading contacts">
      <div className="flex gap-3">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-7 w-72" />
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4" />
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists, searchContacts } from "@/lib/contacts";
import { PAGE_SIZE, STATUSES } from "@/lib/contact-rules";
import { ContactsTable } from "./contacts-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkDeleteContacts,
  deleteAllMatchingContacts,
  bulkArchiveContacts,
  bulkUnarchiveContacts,
} from "./actions";
import { Plus, Upload, ListFilter } from "lucide-react";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function ContactsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading contacts...
        </div>
      }
    >
      <ContactsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactsContent({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const sp = {
    q: one(raw.q),
    status: one(raw.status),
    list: one(raw.list),
    tag: one(raw.tag),
    from: one(raw.from),
    to: one(raw.to),
  };
  const page = Math.max(1, parseInt(one(raw.page) ?? "1", 10) || 1);

  const user = await requireUser();
  const lists = await listOwnedLists(user.$id);

  const { rows, total } = await searchContacts(user.$id, {
    q: sp.q,
    status: sp.status,
    listId: sp.list,
    tag: sp.tag,
    from: sp.from,
    to: sp.to,
    page,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/contacts?${params.toString()}`;
  }

  const listsForTable = lists.map((l) => ({ id: l.$id, name: l.name }));

  const plainRows = rows.map((c) => ({
    $id: c.$id,
    $createdAt: c.$createdAt,
    accountId: c.accountId,
    email: c.email,
    name: c.name,
    status: c.status,
    source: c.source,
    tags: c.tags ?? [],
    listIds: c.listIds ?? [],
    consentAt: c.consentAt,
    consentUrl: c.consentUrl,
    consentKeyId: c.consentKeyId,
    note: c.note ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Contacts ({total})
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your audience, subscriber consent, and segmentation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/contacts/lists" />}>
            <ListFilter className="size-3.5" />
            <span>Lists</span>
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/contacts/import" />}>
            <Upload className="size-3.5" />
            <span>Import CSV</span>
          </Button>
          <Button size="sm" render={<Link href="/contacts/new" />}>
            <Plus className="size-3.5" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Filter Form */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <form className="flex flex-wrap items-end gap-2.5 text-xs">
          <div className="w-full sm:w-48">
            <Input
              name="q"
              defaultValue={sp.q}
              placeholder="Search email or name..."
              className="h-8 text-xs"
            />
          </div>
          <div className="w-full sm:w-36">
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              aria-label="Filter by status"
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <select
              name="list"
              defaultValue={sp.list ?? ""}
              aria-label="Filter by list"
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Any list</option>
              {lists.map((l) => (
                <option key={l.$id} value={l.$id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-28">
            <Input
              name="tag"
              defaultValue={sp.tag}
              placeholder="Tag..."
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              name="from"
              type="date"
              defaultValue={sp.from}
              aria-label="Date from"
              className="h-8 w-32 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              name="to"
              type="date"
              defaultValue={sp.to}
              aria-label="Date to"
              className="h-8 w-32 text-xs"
            />
          </div>
          <Button size="sm" type="submit">
            Filter
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/contacts" />}>
            Clear
          </Button>
        </form>
      </div>

      {/* Contacts Table Component */}
      <ContactsTable
        rows={plainRows}
        lists={listsForTable}
        total={total}
        filters={sp}
        bulkDeleteAction={bulkDeleteContacts}
        deleteAllAction={deleteAllMatchingContacts}
        bulkArchiveAction={bulkArchiveContacts}
        bulkUnarchiveAction={bulkUnarchiveContacts}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="xs" render={<Link href={href(page - 1)} />}>
              ← Previous
            </Button>
          )}
          {page < pages && (
            <Button variant="outline" size="xs" render={<Link href={href(page + 1)} />}>
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive, ArchiveRestore, ChevronDown, Download, FolderMinus, FolderPlus, ListPlus, MailX, Plus, SearchX,
  Tags, Trash2, Upload, Users, X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { type ContactStatus } from "@/lib/contact-rules";
import { canArchive, canDelete, canUnarchive, canUnsubscribe } from "@/lib/contact-status";
import { formatNumber, plural } from "@/lib/format";
import {
  bulkAddTags, bulkAddToList, bulkArchiveContacts, bulkDeleteContacts, bulkRemoveFromList, bulkRemoveTags,
  bulkUnarchiveContacts, bulkUnsubscribeContacts, deleteAllMatchingContacts, type ActionResult,
} from "./actions";
import { ContactsToolbar } from "./contacts-toolbar";
import { ContactsTable, type RowAction } from "./contacts-table";
import { ContactsPagination } from "./contacts-pagination";
import { TagsDialog } from "./tags-dialog";
import { filterParams, hasFilters, type ContactItem, type ContactsView } from "./view";

type Fields = Record<string, string | string[]>;

const KEEP_NOTE =
  "Unsubscribed, bounced, and complained contacts are not deleted. They are kept so that they never get email again.";

export function ContactsManager({
  view,
  rows,
  total,
  counts,
  lists,
  pageSize,
}: {
  view: ContactsView;
  rows: ContactItem[];
  total: number;
  counts: Record<"all" | ContactStatus, number>;
  lists: { id: string; name: string }[];
  pageSize: number;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [acting, startAction] = useTransition();
  // Tabs and selects move at once; the table follows when the server answers.
  const [shownView, setShownView] = useOptimistic(view);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [tagMode, setTagMode] = useState<"add" | "remove" | null>(null);
  const [tagDialogKey, setTagDialogKey] = useState(0);
  const [confirmDialog, confirm] = useConfirm();

  const listNames = new Map(lists.map((l) => [l.id, l.name]));
  const filters = filterParams(view);
  const exportHref = `/contacts/export${filters.size > 0 ? `?${filters}` : ""}`;

  function clearSelection() {
    setSelected(new Set());
    setAllMatching(false);
  }

  function navigate(patch: Partial<ContactsView>, opts?: { replace?: boolean }) {
    // Start from the address bar, not from props: a late search must not undo a newer tab change.
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    if (!("page" in patch) || patch.page === 1) params.delete("page");
    const qs = params.toString();
    const url = qs ? `/contacts?${qs}` : "/contacts";

    clearSelection();
    startNavigation(() => {
      setShownView((cur) => ({ ...cur, ...patch, page: patch.page ?? 1 }));
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }

  // Runs a server action, then shows its message. The page data refreshes by itself.
  async function run(action: (fd: FormData) => Promise<ActionResult>, fields: Fields) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
    try {
      const res = await action(fd);
      if (res.ok) {
        toast.success(res.message);
        clearSelection();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  }

  const act = (action: (fd: FormData) => Promise<ActionResult>, fields: Fields) =>
    startAction(() => run(action, fields));

  // ----- selection -----
  const ids = [...selected];
  const chosen = rows.filter((c) => selected.has(c.$id));
  const allOnPage = rows.length > 0 && rows.every((c) => selected.has(c.$id));

  function toggle(id: string) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setAllMatching(false);
    setSelected(allOnPage ? new Set() : new Set(rows.map((c) => c.$id)));
  }

  // ----- confirmations -----
  function confirmDelete(targets: string[], label: string) {
    confirm({
      title: `Delete ${label}?`,
      description: `You cannot undo this. ${KEEP_NOTE}`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => run(bulkDeleteContacts, { ids: targets }),
    });
  }

  function confirmUnsubscribe(targets: string[], label: string) {
    confirm({
      title: `Unsubscribe ${label}?`,
      description:
        "They will get no more campaigns or automation emails. You cannot undo this, and they cannot sign up again with a form.",
      confirmLabel: "Unsubscribe",
      destructive: true,
      onConfirm: () => run(bulkUnsubscribeContacts, { ids: targets }),
    });
  }

  function confirmDeleteAll() {
    const fields: Fields = Object.fromEntries(filters.entries());
    confirm({
      title: `Delete all ${plural(total, "matching contact")}?`,
      description: `This deletes every contact in this view, also on the other pages. You cannot undo this. ${KEEP_NOTE}`,
      confirmLabel: `Delete ${formatNumber(total)}`,
      destructive: true,
      onConfirm: () => run(deleteAllMatchingContacts, fields),
    });
  }

  function onRowAction(action: RowAction, c: ContactItem) {
    const one = [c.$id];
    if (action === "copy") {
      navigator.clipboard.writeText(c.email).then(
        () => toast.success("Email copied."),
        () => toast.error("Could not copy the email.")
      );
    } else if (action === "archive") act(bulkArchiveContacts, { ids: one });
    else if (action === "unarchive") act(bulkUnarchiveContacts, { ids: one });
    else if (action === "unsubscribe") confirmUnsubscribe(one, c.email);
    else if (action === "delete") confirmDelete(one, c.email);
  }

  function openTags(mode: "add" | "remove") {
    setTagDialogKey((k) => k + 1); // a new, empty dialog every time
    setTagMode(mode);
  }

  const countLabel = plural(ids.length, "contact");
  const emptyAccount = Object.values(counts).every((n) => n === 0) && !hasFilters(view);

  return (
    <div className="space-y-4">
      <ContactsToolbar
        view={shownView}
        counts={counts}
        lists={lists}
        total={total}
        pending={navigating || acting}
        exportHref={exportHref}
        onNavigate={navigate}
      />

      {/* ----- bulk action bar ----- */}
      {(selected.size > 0 || allMatching) && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
          {allMatching ? (
            <>
              <span className="font-medium">All {plural(total, "matching contact")} are selected.</span>
              <Button variant="ghost" size="xs" onClick={clearSelection}>
                <X />
                Clear
              </Button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <a href={exportHref} download className={buttonVariants({ variant: "outline", size: "xs" })}>
                  <Download />
                  Export CSV
                </a>
                <Button variant="destructive" size="xs" onClick={confirmDeleteAll}>
                  <Trash2 />
                  Delete all
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="font-medium tabular-nums">{selected.size} selected</span>
              <Button variant="ghost" size="xs" onClick={clearSelection}>
                <X />
                Clear
              </Button>
              {allOnPage && total > rows.length && (
                <Button variant="link" size="xs" className="px-0" onClick={() => setAllMatching(true)}>
                  Select all {plural(total, "matching contact")}
                </Button>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="xs" disabled={acting} />}>
                    <ListPlus />
                    Lists
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {lists.length === 0 ? (
                      <>
                        <DropdownMenuLabel>You have no lists yet.</DropdownMenuLabel>
                        <DropdownMenuItem render={<Link href="/contacts/lists" />}>
                          <Plus />
                          Create a list
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderPlus />
                            Add to list
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="max-h-72 w-48">
                            {lists.map((l) => (
                              <DropdownMenuItem key={l.id} onClick={() => act(bulkAddToList, { ids, listId: l.id })}>
                                <span className="truncate">{l.name}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderMinus />
                            Remove from list
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="max-h-72 w-48">
                            {lists.map((l) => (
                              <DropdownMenuItem key={l.id} onClick={() => act(bulkRemoveFromList, { ids, listId: l.id })}>
                                <span className="truncate">{l.name}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="xs" disabled={acting} />}>
                    <Tags />
                    Tags
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openTags("add")}>Add tags…</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openTags("remove")}>Remove tags…</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {chosen.some((c) => canArchive(c.status)) && (
                  <Button variant="outline" size="xs" disabled={acting} onClick={() => act(bulkArchiveContacts, { ids })}>
                    <Archive />
                    Archive
                  </Button>
                )}
                {chosen.some((c) => canUnarchive(c.status)) && (
                  <Button variant="outline" size="xs" disabled={acting} onClick={() => act(bulkUnarchiveContacts, { ids })}>
                    <ArchiveRestore />
                    Unarchive
                  </Button>
                )}
                {chosen.some((c) => canUnsubscribe(c.status)) && (
                  <Button variant="outline" size="xs" disabled={acting} onClick={() => confirmUnsubscribe(ids, countLabel)}>
                    <MailX />
                    Unsubscribe
                  </Button>
                )}
                {chosen.some((c) => canDelete(c.status)) && (
                  <Button variant="destructive" size="xs" disabled={acting} onClick={() => confirmDelete(ids, countLabel)}>
                    <Trash2 />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ----- table or empty state ----- */}
      {rows.length === 0 ? (
        <EmptyState
          kind={emptyAccount ? "account" : total > 0 ? "page" : "filters"}
          onClear={() =>
            navigate({ q: undefined, status: undefined, list: undefined, tag: undefined, from: undefined, to: undefined })
          }
          onFirstPage={() => navigate({ page: 1 })}
        />
      ) : (
        <div
          aria-busy={navigating}
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-opacity",
            navigating && "opacity-60"
          )}
        >
          <ContactsTable
            rows={rows}
            listNames={listNames}
            selected={selected}
            allMatching={allMatching}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onFilter={navigate}
            onAction={onRowAction}
          />
        </div>
      )}

      {rows.length > 0 && (
        <ContactsPagination page={view.page} pageSize={pageSize} total={total} onNavigate={navigate} />
      )}

      <TagsDialog
        key={tagDialogKey}
        mode={tagMode}
        count={ids.length}
        onClose={() => setTagMode(null)}
        onApply={(tags) => run(tagMode === "remove" ? bulkRemoveTags : bulkAddTags, { ids, tags: tags.join(",") })}
      />
      {confirmDialog}
    </div>
  );
}

function EmptyState({
  kind,
  onClear,
  onFirstPage,
}: {
  kind: "account" | "filters" | "page";
  onClear: () => void;
  onFirstPage: () => void;
}) {
  const content = {
    account: {
      icon: <Users className="size-5 text-muted-foreground" />,
      title: "No contacts yet",
      text: "Add people one by one, import a CSV file, or collect sign-ups with a form.",
    },
    filters: {
      icon: <SearchX className="size-5 text-muted-foreground" />,
      title: "No contacts match this view",
      text: "Try other words, another status, or fewer filters.",
    },
    page: {
      icon: <SearchX className="size-5 text-muted-foreground" />,
      title: "This page is empty",
      text: "The contacts on this page were moved or deleted.",
    },
  }[kind];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
          {content.icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{content.title}</h2>
          <p className="max-w-sm text-xs text-muted-foreground">{content.text}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {kind === "account" && (
            <>
              <Button size="sm" render={<Link href="/contacts/new" />}>
                <Plus />
                Add contact
              </Button>
              <Button size="sm" variant="outline" render={<Link href="/contacts/import" />}>
                <Upload />
                Import CSV
              </Button>
            </>
          )}
          {kind === "filters" && (
            <Button size="sm" variant="outline" onClick={onClear}>
              <X />
              Clear all filters
            </Button>
          )}
          {kind === "page" && (
            <Button size="sm" variant="outline" onClick={onFirstPage}>
              Go to the first page
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

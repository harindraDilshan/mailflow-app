"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ContactRow } from "@/lib/contacts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { placeholders } from "@/src/lib/placeholders";

type Filters = {
  q?: string;
  status?: string;
  list?: string;
  tag?: string;
  from?: string;
  to?: string;
};

export function ContactsTable({
  rows,
  lists,
  total,
  filters,
  bulkDeleteAction,
  deleteAllAction,
  bulkArchiveAction,
  bulkUnarchiveAction,
}: {
  rows: ContactRow[];
  lists: { id: string; name: string }[];
  total: number;
  filters: Filters;
  bulkDeleteAction: (formData: FormData) => Promise<void>;
  deleteAllAction: (formData: FormData) => Promise<void>;
  bulkArchiveAction?: (formData: FormData) => Promise<void>;
  bulkUnarchiveAction?: (formData: FormData) => Promise<void>;
}) {
  const listName = new Map(lists.map((l) => [l.id, l.name]));

  const bulkDeleteFormRef = useRef<HTMLFormElement>(null);
  const bulkArchiveFormRef = useRef<HTMLFormElement>(null);
  const bulkUnarchiveFormRef = useRef<HTMLFormElement>(null);
  const allFormRef = useRef<HTMLFormElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);

  const selectable = rows.filter(
    (c) => c.status === "active" || c.status === "pending" || c.status === "archived"
  );
  const allPageSelected =
    selectable.length > 0 && selectable.every((c) => selected.has(c.$id));

  const showSelectAllPrompt = allPageSelected && !selectAllMode && total > rows.length;

  function toggleAll() {
    setSelectAllMode(false);
    setSelected(
      allPageSelected ? new Set() : new Set(selectable.map((c) => c.$id))
    );
  }

  function toggle(id: string) {
    setSelectAllMode(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectAllMode(false);
    setSelected(new Set());
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Delete ${selected.size} ${noun}? This action cannot be undone.`)) return;
    bulkDeleteFormRef.current?.requestSubmit();
  }

  function handleBulkArchive() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Archive ${selected.size} ${noun}?`)) return;
    bulkArchiveFormRef.current?.requestSubmit();
  }

  function handleBulkUnarchive() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Unarchive ${selected.size} ${noun}?`)) return;
    bulkUnarchiveFormRef.current?.requestSubmit();
  }

  function handleDeleteAll() {
    if (!confirm(`Delete all ${total} matching contacts? This action cannot be undone.`)) return;
    allFormRef.current?.requestSubmit();
  }

  const hasArchivedSelected = rows.some(
    (c) => selected.has(c.$id) && c.status === "archived"
  );
  const hasActiveOrPendingSelected = rows.some(
    (c) => selected.has(c.$id) && (c.status === "active" || c.status === "pending")
  );

  const showArchive =
    bulkArchiveAction &&
    (hasActiveOrPendingSelected || (!hasArchivedSelected && !hasActiveOrPendingSelected));
  const showUnarchive =
    bulkUnarchiveAction &&
    (hasArchivedSelected || (!hasArchivedSelected && !hasActiveOrPendingSelected));

  return (
    <div className="space-y-3">
      {/* ── ID-based bulk delete form (current page selection) ── */}
      <form ref={bulkDeleteFormRef} action={bulkDeleteAction}>
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
      </form>

      {/* ── ID-based bulk archive form (current page selection) ── */}
      {bulkArchiveAction && (
        <form ref={bulkArchiveFormRef} action={bulkArchiveAction}>
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
        </form>
      )}

      {/* ── ID-based bulk unarchive form (current page selection) ── */}
      {bulkUnarchiveAction && (
        <form ref={bulkUnarchiveFormRef} action={bulkUnarchiveAction}>
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
        </form>
      )}

      {/* ── Filter-based delete-all form (all matching contacts) ── */}
      <form ref={allFormRef} action={deleteAllAction} className="hidden">
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        {filters.list && <input type="hidden" name="listId" value={filters.list} />}
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        {filters.from && <input type="hidden" name="from" value={filters.from} />}
        {filters.to && <input type="hidden" name="to" value={filters.to} />}
      </form>

      {/* ── Action bar ── */}
      {selectAllMode ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            All {total} matching contacts are selected.
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-muted-foreground underline hover:text-foreground"
          >
            {placeholders.cancel}
          </button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={handleDeleteAll}
            className="ml-auto"
          >
            {placeholders.delete} ({total})
          </Button>
        </div>
      ) : selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          {showArchive && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleBulkArchive}
            >
              Archive
            </Button>
          )}
          {showUnarchive && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleBulkUnarchive}
            >
              Unarchive
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={handleBulkDelete}
          >
            Delete selected
          </Button>

          {showSelectAllPrompt && (
            <span className="text-muted-foreground">
              All {rows.length} on this page selected.{" "}
              <button
                type="button"
                onClick={() => setSelectAllMode(true)}
                className="text-foreground underline"
              >
                Select all {total} matching contacts
              </button>
            </span>
          )}
        </div>
      ) : null}

      {/* ── Contacts table ── */}
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleAll}
                  disabled={selectable.length === 0}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Lists</TableHead>
              <TableHead>Added Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => {
              const canSelect =
                c.status === "active" || c.status === "pending" || c.status === "archived";
              return (
                <TableRow key={c.$id}>
                  <TableCell>
                    {canSelect && (
                      <Checkbox
                        checked={selected.has(c.$id) || selectAllMode}
                        onCheckedChange={() => toggle(c.$id)}
                        aria-label={`Select ${c.email}`}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/contacts/${c.$id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.email}
                    </Link>
                    {c.note && (
                      <span
                        title={c.note}
                        className="ml-1.5 inline-block cursor-help font-mono text-[10px] text-muted-foreground"
                      >
                        [note]
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.name || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "active"
                          ? "default"
                          : c.status === "archived"
                            ? "outline"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(c.tags ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(c.listIds ?? [])
                      .map((id) => listName.get(id))
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.$createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

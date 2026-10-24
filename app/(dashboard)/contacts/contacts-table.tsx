"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ContactRow } from "@/lib/contacts";

type Filters = {
  q?: string;
  status?: string;
  list?: string;   // URL param name used by the filter form
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

  // Form ref for ID-based bulk delete (current-page selection).
  const bulkDeleteFormRef = useRef<HTMLFormElement>(null);
  // Form ref for ID-based bulk archive (current-page selection).
  const bulkArchiveFormRef = useRef<HTMLFormElement>(null);
  // Form ref for ID-based bulk unarchive (current-page selection).
  const bulkUnarchiveFormRef = useRef<HTMLFormElement>(null);
  // Form ref for filter-based delete (all matching contacts).
  const allFormRef = useRef<HTMLFormElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // True when the user has opted in to "select all matching contacts" mode.
  const [selectAllMode, setSelectAllMode] = useState(false);

  // Active, pending, and archived contacts can be deleted or managed.
  const selectable = rows.filter(
    (c) => c.status === "active" || c.status === "pending" || c.status === "archived"
  );
  const allPageSelected =
    selectable.length > 0 && selectable.every((c) => selected.has(c.$id));

  // Show the cross-page "Select all N" prompt only when every selectable contact
  // on this page is checked AND there are more contacts beyond this page.
  const showSelectAllPrompt = allPageSelected && !selectAllMode && total > rows.length;

  function toggleAll() {
    // Changing the page selection always exits select-all mode.
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

  // Confirm + submit the ID-based bulk delete form.
  function handleBulkDelete() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Delete ${selected.size} ${noun}? This action cannot be undone.`)) return;
    bulkDeleteFormRef.current?.requestSubmit();
  }

  // Confirm + submit the ID-based bulk archive form.
  function handleBulkArchive() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Archive ${selected.size} ${noun}?`)) return;
    bulkArchiveFormRef.current?.requestSubmit();
  }

  // Confirm + submit the ID-based bulk unarchive form.
  function handleBulkUnarchive() {
    if (selected.size === 0) return;
    const noun = selected.size === 1 ? "contact" : "contacts";
    if (!confirm(`Unarchive ${selected.size} ${noun}?`)) return;
    bulkUnarchiveFormRef.current?.requestSubmit();
  }

  // Confirm + submit the filter-based delete-all form.
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
    <>
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
        {filters.q      && <input type="hidden" name="q"      value={filters.q} />}
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        {filters.list   && <input type="hidden" name="listId" value={filters.list} />}
        {filters.tag    && <input type="hidden" name="tag"    value={filters.tag} />}
        {filters.from   && <input type="hidden" name="from"   value={filters.from} />}
        {filters.to     && <input type="hidden" name="to"     value={filters.to} />}
      </form>

      {/* ── Action bar ── */}
      {selectAllMode ? (
        <div className="mb-2 flex items-center gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <span className="text-blue-800">All {total} matching contacts are selected.</span>
          <button type="button" onClick={clearSelection} className="underline text-blue-700">
            Clear selection
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            className="ml-auto rounded border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50"
          >
            Delete all {total}
          </button>
        </div>
      ) : selected.size > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-700">{selected.size} selected</span>
          {showArchive && (
            <button
              type="button"
              onClick={handleBulkArchive}
              className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
            >
              Archive selected
            </button>
          )}
          {showUnarchive && (
            <button
              type="button"
              onClick={handleBulkUnarchive}
              className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
            >
              Unarchive selected
            </button>
          )}
          <button
            type="button"
            onClick={handleBulkDelete}
            className="rounded border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50"
          >
            Delete selected
          </button>
          {/* Cross-page prompt: shown only when all selectable contacts on this
              page are checked and further pages exist. */}
          {showSelectAllPrompt && (
            <span className="text-gray-500">
              All {rows.length} on this page are selected.{" "}
              <button
                type="button"
                onClick={() => setSelectAllMode(true)}
                className="underline text-gray-700"
              >
                Select all {total} matching contacts
              </button>
            </span>
          )}
        </div>
      ) : null}

      {/* ── Contacts table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  disabled={selectable.length === 0}
                  aria-label="Select all on this page"
                />
              </th>
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Tags</th>
              <th className="p-2">Lists</th>
              <th className="p-2">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-gray-500">
                  No contacts found.
                </td>
              </tr>
            )}
            {rows.map((c) => {
              const canSelect = c.status === "active" || c.status === "pending" || c.status === "archived";
              return (
                <tr key={c.$id} className="border-t">
                  <td className="p-2">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.$id) || selectAllMode}
                        onChange={() => toggle(c.$id)}
                        aria-label={`Select ${c.email}`}
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <Link href={`/contacts/${c.$id}`} className="underline">
                      {c.email}
                    </Link>
                    {c.note && (
                      <span
                        title={c.note}
                        className="ml-1.5 inline-block cursor-help text-xs text-gray-500"
                      >
                        [note]
                      </span>
                    )}
                  </td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.status}</td>
                  <td className="p-2">{(c.tags ?? []).join(", ")}</td>
                  <td className="p-2">
                    {(c.listIds ?? [])
                      .map((id) => listName.get(id))
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="p-2">
                    {new Date(c.$createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

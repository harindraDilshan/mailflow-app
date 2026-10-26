"use client";

import Link from "next/link";
import {
  Archive, ArchiveRestore, Copy, MailX, MoreHorizontal, PencilLine, StickyNote, Trash2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/contacts/status-badge";
import { canArchive, canDelete, canUnarchive, canUnsubscribe, sourceLabel } from "@/lib/contact-status";
import { formatDate, initials } from "@/lib/format";
import type { ContactItem, ContactsView } from "./view";

export type RowAction = "copy" | "archive" | "unarchive" | "unsubscribe" | "delete";

// A few chips, then "+3". Clicking a chip filters the table by it.
function Chips({
  items,
  max,
  variant,
  onPick,
  pickLabel,
}: {
  items: { key: string; label: string }[];
  max: number;
  variant: "outline" | "secondary";
  onPick: (key: string) => void;
  pickLabel: (label: string) => string;
}) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  const rest = items.slice(max);
  return (
    <div className="flex max-w-56 flex-wrap items-center gap-1">
      {items.slice(0, max).map((i) => (
        <Badge
          key={i.key}
          variant={variant}
          className="max-w-32 cursor-pointer font-normal transition-colors hover:border-foreground/30"
          title={pickLabel(i.label)}
          render={<button type="button" onClick={() => onPick(i.key)} />}
        >
          <span className="truncate">{i.label}</span>
        </Badge>
      ))}
      {rest.length > 0 && (
        <Badge variant="ghost" className="font-normal text-muted-foreground" title={rest.map((i) => i.label).join(", ")}>
          +{rest.length}
        </Badge>
      )}
    </div>
  );
}

function RowMenu({ c, onAction }: { c: ContactItem; onAction: (action: RowAction, c: ContactItem) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.email}`} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem render={<Link href={`/contacts/${c.$id}`} />}>
          <PencilLine />
          View and edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("copy", c)}>
          <Copy />
          Copy email
        </DropdownMenuItem>
        {(canArchive(c.status) || canUnarchive(c.status) || canUnsubscribe(c.status)) && <DropdownMenuSeparator />}
        {canArchive(c.status) && (
          <DropdownMenuItem onClick={() => onAction("archive", c)}>
            <Archive />
            Archive
          </DropdownMenuItem>
        )}
        {canUnarchive(c.status) && (
          <DropdownMenuItem onClick={() => onAction("unarchive", c)}>
            <ArchiveRestore />
            Unarchive
          </DropdownMenuItem>
        )}
        {canUnsubscribe(c.status) && (
          <DropdownMenuItem onClick={() => onAction("unsubscribe", c)}>
            <MailX />
            Unsubscribe
          </DropdownMenuItem>
        )}
        {canDelete(c.status) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onAction("delete", c)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContactsTable({
  rows,
  listNames,
  selected,
  allMatching,
  onToggle,
  onToggleAll,
  onFilter,
  onAction,
}: {
  rows: ContactItem[];
  listNames: Map<string, string>;
  selected: Set<string>;
  allMatching: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onFilter: (patch: Partial<ContactsView>) => void;
  onAction: (action: RowAction, c: ContactItem) => void;
}) {
  const selectedOnPage = rows.filter((c) => allMatching || selected.has(c.$id)).length;
  const allOnPage = rows.length > 0 && selectedOnPage === rows.length;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pl-3">
            <Checkbox
              checked={allOnPage}
              indeterminate={selectedOnPage > 0 && !allOnPage}
              onCheckedChange={onToggleAll}
              aria-label="Select all contacts on this page"
            />
          </TableHead>
          <TableHead className="text-xs">Contact</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="hidden text-xs lg:table-cell">Lists</TableHead>
          <TableHead className="hidden text-xs md:table-cell">Tags</TableHead>
          <TableHead className="hidden text-xs xl:table-cell">Source</TableHead>
          <TableHead className="hidden text-xs sm:table-cell">Added</TableHead>
          <TableHead className="w-10 pr-3">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const isSelected = allMatching || selected.has(c.$id);
          const lists = (c.listIds ?? [])
            .map((id) => ({ key: id, label: listNames.get(id) ?? "" }))
            .filter((l) => l.label); // ignore lists that were deleted
          return (
            <TableRow key={c.$id} data-state={isSelected ? "selected" : undefined}>
              <TableCell className="pl-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(c.$id)}
                  aria-label={`Select ${c.email}`}
                />
              </TableCell>
              <TableCell className="max-w-72">
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px]">{initials(c.name, c.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/contacts/${c.$id}`} className="truncate text-sm font-medium hover:underline">
                        {c.name || c.email}
                      </Link>
                      {c.note && (
                        <Tooltip>
                          <TooltipTrigger
                            aria-label="Show private note"
                            className="shrink-0 rounded text-muted-foreground hover:text-foreground"
                          >
                            <StickyNote className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent className="whitespace-pre-wrap">{c.note}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {c.name && <div className="truncate text-xs text-muted-foreground">{c.email}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="hidden text-xs lg:table-cell">
                <Chips
                  items={lists}
                  max={2}
                  variant="outline"
                  onPick={(list) => onFilter({ list })}
                  pickLabel={(l) => `Show only contacts in ${l}`}
                />
              </TableCell>
              <TableCell className="hidden text-xs md:table-cell">
                <Chips
                  items={(c.tags ?? []).map((t) => ({ key: t, label: t }))}
                  max={3}
                  variant="secondary"
                  onPick={(tag) => onFilter({ tag })}
                  pickLabel={(t) => `Show only contacts tagged ${t}`}
                />
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                {sourceLabel(c.source)}
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground tabular-nums sm:table-cell">
                {formatDate(c.$createdAt)}
              </TableCell>
              <TableCell className="pr-3 text-right">
                <RowMenu c={c} onAction={onAction} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

"use client";

import { Download, Loader2, Search, Tag, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUSES, type ContactStatus } from "@/lib/contact-rules";
import { statusMeta } from "@/lib/contact-status";
import { formatNumber, plural } from "@/lib/format";
import { DebouncedInput } from "./debounced-input";
import { hasFilters, type ContactsView } from "./view";

const TABS = ["all", ...STATUSES] as const;

const SORT_ITEMS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "email_asc", label: "Email A–Z" },
  { value: "email_desc", label: "Email Z–A" },
];

export function ContactsToolbar({
  view,
  counts,
  lists,
  total,
  pending,
  exportHref,
  onNavigate,
}: {
  view: ContactsView;
  counts: Record<"all" | ContactStatus, number>;
  lists: { id: string; name: string }[];
  total: number;
  pending: boolean;
  exportHref: string;
  onNavigate: (patch: Partial<ContactsView>, opts?: { replace?: boolean }) => void;
}) {
  const listItems = [{ value: "all", label: "All lists" }, ...lists.map((l) => ({ value: l.id, label: l.name }))];
  const filtered = hasFilters(view);

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs
          value={view.status ?? "all"}
          onValueChange={(v) => onNavigate({ status: v === "all" ? undefined : String(v) })}
        >
          <TabsList variant="line" aria-label="Filter by status">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="flex-none px-2 text-xs">
                {t === "all" ? "All" : statusMeta(t).label}
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-normal text-muted-foreground tabular-nums">
                  {formatNumber(counts[t])}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <DebouncedInput
            value={view.q ?? ""}
            onCommit={(q) => onNavigate({ q: q || undefined }, { replace: true })}
            icon={<Search />}
            clearable
            placeholder="Search by email or name"
            aria-label="Search contacts"
            className="h-8 text-xs"
          />
        </div>

        <Select
          items={listItems}
          value={view.list ?? "all"}
          onValueChange={(v) => onNavigate({ list: v === "all" || !v ? undefined : String(v) })}
        >
          <SelectTrigger size="sm" className="w-40 text-xs" aria-label="Filter by list">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {listItems.map((l) => (
              <SelectItem key={l.value} value={l.value} className="text-xs">
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-36">
          <DebouncedInput
            value={view.tag ?? ""}
            onCommit={(tag) => onNavigate({ tag: tag.toLowerCase() || undefined }, { replace: true })}
            icon={<Tag />}
            clearable
            placeholder="Tag"
            aria-label="Filter by tag"
            className="h-7 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Added</span>
          <DebouncedInput
            type="date"
            value={view.from ?? ""}
            delay={600}
            max={view.to}
            onCommit={(from) => onNavigate({ from: from || undefined })}
            aria-label="Added on or after"
            className="h-7 w-34 text-xs"
          />
          <span aria-hidden>–</span>
          <DebouncedInput
            type="date"
            value={view.to ?? ""}
            delay={600}
            min={view.from}
            onCommit={(to) => onNavigate({ to: to || undefined })}
            aria-label="Added on or before"
            className="h-7 w-34 text-xs"
          />
        </div>

        <Select
          items={SORT_ITEMS}
          value={view.sort ?? "newest"}
          onValueChange={(v) => onNavigate({ sort: v === "newest" || !v ? undefined : String(v) })}
        >
          <SelectTrigger size="sm" className="w-36 text-xs" aria-label="Sort contacts">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ITEMS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate({ q: undefined, list: undefined, tag: undefined, from: undefined, to: undefined })}
          >
            <X />
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading" />}
          <Tooltip>
            <TooltipTrigger render={<a href={exportHref} download className={buttonVariants({ variant: "outline", size: "sm" })} />}>
              <Download />
              Export
            </TooltipTrigger>
            <TooltipContent>Download the {plural(total, "contact")} in this view as CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

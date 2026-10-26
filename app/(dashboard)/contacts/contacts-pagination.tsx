"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE, PAGE_SIZES } from "@/lib/contact-rules";
import { formatNumber, plural } from "@/lib/format";
import type { ContactsView } from "./view";

const SIZE_ITEMS = PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }));

export function ContactsPagination({
  page,
  pageSize,
  total,
  onNavigate,
}: {
  page: number;
  pageSize: number;
  total: number;
  onNavigate: (patch: Partial<ContactsView>) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : Math.min(total, (page - 1) * pageSize + 1);
  const last = Math.min(total, page * pageSize);
  const go = (p: number) => onNavigate({ page: p });

  return (
    <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span className="tabular-nums">
        {total === 0
          ? "No contacts"
          : `Showing ${formatNumber(first)}–${formatNumber(last)} of ${plural(total, "contact")}`}
      </span>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            items={SIZE_ITEMS}
            value={String(pageSize)}
            onValueChange={(v) => onNavigate({ per: Number(v) === PAGE_SIZE ? undefined : Number(v) })}
          >
            <SelectTrigger size="sm" className="w-18 text-xs" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_ITEMS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="tabular-nums">
          Page {formatNumber(page)} of {formatNumber(pages)}
        </span>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => go(1)} aria-label="First page">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Next page">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => go(pages)} aria-label="Last page">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

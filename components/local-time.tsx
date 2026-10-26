"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatDateTime } from "@/lib/format";

const noop = () => () => {};

/**
 * A date in the viewer's own time zone.
 * The server does not know that time zone, so the first render shows UTC (same text on server
 * and browser: no hydration error) and the browser then switches to local time.
 */
export function LocalTime({ iso, dateOnly = false }: { iso: string | null | undefined; dateOnly?: boolean }) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!iso) return <span>—</span>;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span>—</span>;

  const text = inBrowser
    ? d.toLocaleString(undefined, dateOnly ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" })
    : dateOnly
      ? formatDate(iso)
      : formatDateTime(iso);
  return (
    <time dateTime={d.toISOString()} title={d.toISOString()}>
      {text}
    </time>
  );
}

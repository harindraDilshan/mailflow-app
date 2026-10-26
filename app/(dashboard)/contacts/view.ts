import { CONTACT_SORTS, PAGE_SIZE, PAGE_SIZES, STATUSES } from "@/lib/contact-rules";

// What the contacts screen shows. It lives in the URL, so a view can be shared and the back button works.
export type ContactsView = {
  q?: string;
  status?: string; // empty = "All" (every status except archived)
  list?: string;
  tag?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  sort?: string; // empty = newest first
  per?: number; // empty = PAGE_SIZE
  page: number;
};

// One row of the table. Only plain data goes to the browser.
export type ContactItem = {
  $id: string;
  $createdAt: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  tags: string[];
  listIds: string[];
  note: string | null;
};

export const FILTER_KEYS = ["q", "status", "list", "tag", "from", "to"] as const;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseView(raw: Raw): ContactsView {
  const status = one(raw.status);
  const sort = one(raw.sort);
  const per = Number(one(raw.per));
  return {
    q: one(raw.q),
    status: status && (STATUSES as readonly string[]).includes(status) ? status : undefined,
    list: one(raw.list),
    tag: one(raw.tag),
    from: one(raw.from),
    to: one(raw.to),
    sort: sort && (CONTACT_SORTS as readonly string[]).includes(sort) && sort !== "newest" ? sort : undefined,
    per: (PAGE_SIZES as readonly number[]).includes(per) && per !== PAGE_SIZE ? per : undefined,
    page: Math.max(1, parseInt(one(raw.page) ?? "1", 10) || 1),
  };
}

// True when search, list, tag, or dates narrow the view (the status tab does not count).
export const hasFilters = (v: ContactsView) => Boolean(v.q || v.list || v.tag || v.from || v.to);

// "?q=ann&status=active": the filters only, for the CSV export and "delete all matching".
export function filterParams(v: ContactsView) {
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const value = v[k];
    if (value) params.set(k, value);
  }
  return params;
}

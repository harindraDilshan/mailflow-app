// UTC on purpose: the server and the browser then show the same text (no hydration mismatch),
// and the "Added" date filters also use UTC days.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});
const numberFormat = new Intl.NumberFormat("en-US");

function toDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string | null | undefined) {
  const d = toDate(iso);
  return d ? dateFormat.format(d) : "—";
}

export function formatDateTime(iso: string | null | undefined) {
  const d = toDate(iso);
  return d ? `${dateTimeFormat.format(d)} UTC` : "—";
}

export const formatNumber = (n: number) => numberFormat.format(n);

// plural(1, "contact") -> "1 contact", plural(1200, "contact") -> "1,200 contacts"
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

// "Jane Doe" -> "JD"; no name -> the first two letters of the email.
export function initials(name: string | null | undefined, email: string) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.slice(0, 2).map((w) => w[0]) : [email[0], email[1]];
  return letters.join("").toUpperCase();
}

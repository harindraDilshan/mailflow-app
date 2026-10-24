export const MAX_CONTACTS = 5000; // temporary limit, plans come later
export const MAX_IMPORT_ROWS = 5000;
export const MAX_CHUNK = 100;
export const MAX_TAGS = 20;
export const MAX_LISTS = 50;
export const PAGE_SIZE = 25;
export const STATUSES = ["active", "pending", "unsubscribed", "bounced", "complained", "archived"] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= 254 && EMAIL_REGEX.test(email) && !email.includes("..");
}

export function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 200);
}

// Accepts "vip, News" or ["vip", "News"]. Returns clean, unique, lowercase tags.
export function normalizeTags(input: string | string[]): string[] {
  const parts = Array.isArray(input) ? input : input.split(",");
  const clean = parts
    .map((t) => t.trim().toLowerCase().slice(0, 50))
    .filter(Boolean);
  return [...new Set(clean)].slice(0, MAX_TAGS);
}

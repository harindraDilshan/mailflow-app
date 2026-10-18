export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Text that goes into an email header must not contain line breaks or quotes.
export function cleanHeader(s: string) {
  return s.replace(/[\r\n"<>]/g, "").trim();
}

// Finds <a href="https://..."> links. Other links (mailto:, tel:, #) are left alone.
const LINK_RE = /(<a\b[^>]*?\bhref\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi;
const decode = (u: string) => u.replace(/&amp;/g, "&");

export function extractLinks(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(LINK_RE)) urls.add(decode(m[3]));
  return [...urls];
}

export function rewriteLinks(html: string, wrap: (url: string) => string) {
  return html.replace(
    LINK_RE,
    (_m, pre: string, quote: string, url: string) => `${pre}${quote}${wrap(decode(url))}${quote}`
  );
}

export type Tracking = { trackLink: (url: string) => string; pixelUrl: string };

export function renderEmail(
  html: string,
  contact: { name?: string | null; email: string },
  unsubscribeUrl: string,
  tracking?: Tracking
) {
  const name = (contact.name ?? "").trim() || "friend";
  let body = html
    .replace(/\{\{\s*name\s*\}\}/gi, () => escapeHtml(name))
    .replace(/\{\{\s*email\s*\}\}/gi, () => escapeHtml(contact.email));

  // Track the customer's links first. The unsubscribe footer is added after, so it stays untouched.
  if (tracking) body = rewriteLinks(body, tracking.trackLink);

  const footer =
    `<p style="font-size:12px;color:#666;margin-top:32px">` +
    `You are receiving this email because you subscribed to our list. ` +
    `<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
  const pixel = tracking
    ? `<img src="${escapeHtml(tracking.pixelUrl)}" width="1" height="1" alt="" style="display:none" />`
    : "";
  const tail = footer + pixel;

  return /<\/body>/i.test(body)
    ? body.replace(/<\/body>/i, () => tail + "</body>")
    : body + tail;
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
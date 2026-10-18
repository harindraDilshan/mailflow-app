export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Text that goes into an email header must not contain line breaks or quotes.
export function cleanHeader(s: string) {
  return s.replace(/[\r\n"<>]/g, "").trim();
}

export function renderEmail(
  html: string,
  contact: { name?: string | null; email: string },
  unsubscribeUrl: string
) {
  const name = (contact.name ?? "").trim() || "friend";
  const body = html
    .replace(/\{\{\s*name\s*\}\}/gi, () => escapeHtml(name))
    .replace(/\{\{\s*email\s*\}\}/gi, () => escapeHtml(contact.email));

  const footer =
    `<p style="font-size:12px;color:#666;margin-top:32px">` +
    `You are receiving this email because you subscribed to our list. ` +
    `<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;

  return /<\/body>/i.test(body)
    ? body.replace(/<\/body>/i, () => footer + "</body>")
    : body + footer;
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
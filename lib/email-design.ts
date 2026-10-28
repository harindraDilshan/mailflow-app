// A visual email design: a list of blocks and some style settings.
// renderDesign() turns it into email HTML that works in Gmail, Outlook, and Apple Mail:
// tables, inline styles, and a narrow layout on phones.
// Pure code: the editor (live preview), the server, and the tests use it.

import { escapeHtml } from "@/lib/email/render";
import { textColorOn } from "@/lib/forms";

export type Align = "left" | "center";
export type FontKey = "sans" | "serif" | "verdana" | "trebuchet" | "system";

export const FONTS: Record<FontKey, { label: string; stack: string }> = {
  sans: { label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  system: { label: "System (modern)", stack: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  verdana: { label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  trebuchet: { label: "Trebuchet", stack: "'Trebuchet MS', Tahoma, sans-serif" },
  serif: { label: "Georgia (serif)", stack: "Georgia, 'Times New Roman', serif" },
};

export type DesignSettings = {
  background: string; // around the email
  contentBackground: string; // the email card
  textColor: string;
  linkColor: string;
  buttonColor: string;
  font: FontKey;
  width: number; // px
};

export type Block =
  | { id: string; type: "header"; text: string; background: string; color: string; align: Align }
  | { id: string; type: "heading"; text: string; size: "large" | "medium"; align: Align }
  | { id: string; type: "text"; text: string; align: Align }
  | { id: string; type: "image"; src: string; alt: string; href: string; width: number; align: Align }
  | { id: string; type: "button"; label: string; href: string; color: string; align: Align }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; height: number }
  | { id: string; type: "footer"; text: string };

export type BlockType = Block["type"];
export type EmailDesign = { version: 1; settings: DesignSettings; blocks: Block[] };

export const MAX_BLOCKS = 40;
export const DEFAULT_SETTINGS: DesignSettings = {
  background: "#f4f4f5",
  contentBackground: "#ffffff",
  textColor: "#27272a",
  linkColor: "#2563eb",
  buttonColor: "#18181b",
  font: "sans",
  width: 600,
};

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const align = (v: unknown): Align => (v === "left" ? "left" : "center");

let counter = 0;
export const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- new blocks ----------
export function newBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "header":
      return { id, type, text: "Your brand", background: "#18181b", color: "#ffffff", align: "center" };
    case "heading":
      return { id, type, text: "A clear heading", size: "large", align: "left" };
    case "text":
      return { id, type, text: "Hi {{name}},\n\nWrite your message here.", align: "left" };
    case "image":
      return { id, type, src: "", alt: "", href: "", width: 100, align: "center" };
    case "button":
      return { id, type, label: "Learn more", href: "https://example.com", color: "", align: "center" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, height: 24 };
    case "footer":
      return {
        id,
        type,
        text: `You get this email because you signed up on our website.\nYour company · ${SAMPLE_ADDRESS}`,
      };
  }
}

export function blankDesign(): EmailDesign {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, blocks: [newBlock("text"), newBlock("footer")] };
}

// ---------- reading a design safely (from the browser or the database) ----------
function cleanBlock(raw: Record<string, unknown>): Block | null {
  const id = typeof raw.id === "string" && /^[a-z0-9_-]{1,40}$/i.test(raw.id) ? raw.id : newId();
  switch (raw.type) {
    case "header":
      return { id, type: "header", text: str(raw.text, 120), background: hex(raw.background, "#18181b"), color: hex(raw.color, "#ffffff"), align: align(raw.align) };
    case "heading":
      return { id, type: "heading", text: str(raw.text, 200), size: raw.size === "medium" ? "medium" : "large", align: align(raw.align) };
    case "text":
      return { id, type: "text", text: str(raw.text, 5000), align: align(raw.align) };
    case "image":
      return { id, type: "image", src: str(raw.src, 2000), alt: str(raw.alt, 200), href: str(raw.href, 2000), width: clamp(raw.width, 10, 100, 100), align: align(raw.align) };
    case "button":
      return { id, type: "button", label: str(raw.label, 80), href: str(raw.href, 2000), color: raw.color ? hex(raw.color, "") : "", align: align(raw.align) };
    case "divider":
      return { id, type: "divider" };
    case "spacer":
      return { id, type: "spacer", height: clamp(raw.height, 8, 96, 24) };
    case "footer":
      return { id, type: "footer", text: str(raw.text, 1000) };
    default:
      return null; // an unknown kind of block is dropped
  }
}

/** A clean design, or null when the input is not a design. */
export function parseDesign(input: unknown): EmailDesign | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { settings?: Record<string, unknown>; blocks?: unknown };
  if (!Array.isArray(raw.blocks)) return null;
  const s = raw.settings ?? {};
  const font = (Object.keys(FONTS) as FontKey[]).includes(s.font as FontKey) ? (s.font as FontKey) : DEFAULT_SETTINGS.font;
  return {
    version: 1,
    settings: {
      background: hex(s.background, DEFAULT_SETTINGS.background),
      contentBackground: hex(s.contentBackground, DEFAULT_SETTINGS.contentBackground),
      textColor: hex(s.textColor, DEFAULT_SETTINGS.textColor),
      linkColor: hex(s.linkColor, DEFAULT_SETTINGS.linkColor),
      buttonColor: hex(s.buttonColor, DEFAULT_SETTINGS.buttonColor),
      font,
      width: clamp(s.width, 480, 700, DEFAULT_SETTINGS.width),
    },
    blocks: raw.blocks
      .slice(0, MAX_BLOCKS)
      .map((b) => (b && typeof b === "object" ? cleanBlock(b as Record<string, unknown>) : null))
      .filter((b): b is Block => b !== null),
  };
}

export function parseDesignJson(json: string | null | undefined) {
  if (!json) return null;
  try {
    return parseDesign(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---------- rendering ----------
/** Links only to web pages, email addresses, phone numbers, or a merge tag. Anything else becomes "#". */
export function safeHref(url: string) {
  const u = url.trim();
  return /^(https?:\/\/|mailto:|tel:|\{\{)/i.test(u) ? u : "#";
}

/**
 * The text of a text or footer block. A small set of marks, so people do not need HTML:
 * **bold**, *italic*, [link text](https://…), and an empty line for a new paragraph.
 * Everything else is escaped.
 */
export function richText(text: string, linkColor: string) {
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
        const href = safeHref(url.replace(/&amp;/g, "&"));
        return href === "#" ? label : `<a href="${escapeHtml(href)}" style="color:${linkColor};text-decoration:underline;">${label}</a>`;
      })
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\n/g, "<br>");
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i, all) => `<p style="margin:0${i < all.length - 1 ? " 0 14px" : ""};">${inline(p)}</p>`)
    .join("");
}

const PAD = "padding-left:32px;padding-right:32px;";

function renderBlock(b: Block, s: DesignSettings, preview: boolean): string {
  const e = escapeHtml;
  switch (b.type) {
    case "header":
      return `<tr><td class="mf-pad" style="${PAD}padding-top:20px;padding-bottom:20px;background:${b.background};color:${b.color};text-align:${b.align};font-size:20px;font-weight:bold;letter-spacing:0.2px;">${e(b.text)}</td></tr>`;
    case "heading":
      return `<tr><td class="mf-pad" style="${PAD}padding-top:28px;padding-bottom:4px;text-align:${b.align};"><h1 style="margin:0;font-size:${b.size === "large" ? 28 : 22}px;line-height:1.3;color:${s.textColor};">${e(b.text)}</h1></td></tr>`;
    case "text":
      return `<tr><td class="mf-pad" style="${PAD}padding-top:12px;padding-bottom:12px;text-align:${b.align};font-size:16px;line-height:1.6;color:${s.textColor};">${richText(b.text, s.linkColor)}</td></tr>`;
    case "image": {
      const src = b.src.trim();
      if (!/^https?:\/\//i.test(src)) {
        // Without a picture: nothing in the email, a gray box in the editor.
        return preview
          ? `<tr><td class="mf-pad" style="${PAD}padding-top:12px;padding-bottom:12px;"><div style="background:#e4e4e7;color:#71717a;height:160px;line-height:160px;border-radius:6px;font-size:14px;text-align:center;">Image: add a picture link</div></td></tr>`
          : "";
      }
      const px = Math.round(((s.width - 64) * b.width) / 100);
      const img = `<img src="${e(src)}" alt="${e(b.alt)}" width="${px}" style="display:inline-block;width:${b.width}%;max-width:100%;height:auto;border:0;border-radius:6px;">`;
      const href = b.href.trim() ? safeHref(b.href) : "";
      return `<tr><td class="mf-pad" style="${PAD}padding-top:12px;padding-bottom:12px;text-align:${b.align};font-size:0;">${href ? `<a href="${e(href)}">${img}</a>` : img}</td></tr>`;
    }
    case "button": {
      const color = b.color || s.buttonColor;
      return `<tr><td class="mf-pad" align="${b.align}" style="${PAD}padding-top:16px;padding-bottom:16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:6px;background:${color};"><a href="${e(safeHref(b.href))}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:bold;color:${textColorOn(color)};text-decoration:none;border-radius:6px;">${e(b.label)}</a></td></tr></table></td></tr>`;
    }
    case "divider":
      return `<tr><td class="mf-pad" style="${PAD}padding-top:16px;padding-bottom:16px;"><div style="border-top:1px solid #e4e4e7;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>`;
    case "spacer":
      return `<tr><td style="height:${b.height}px;line-height:${b.height}px;font-size:0;">&nbsp;</td></tr>`;
    case "footer":
      return `<tr><td class="mf-pad" style="${PAD}padding-top:24px;padding-bottom:24px;text-align:center;font-size:12px;line-height:1.5;color:#71717a;">${richText(b.text, s.linkColor)}</td></tr>`;
  }
}

// Only in the editor: every block row has its ID, so a click on it can select the block.
const PREVIEW_STYLE = `
  [data-mf-block] { cursor: pointer; }
  [data-mf-block]:hover { outline: 2px dashed #93c5fd; outline-offset: -2px; }
  [data-mf-block][data-mf-selected] { outline: 2px solid #3b82f6; outline-offset: -2px; }`;

/**
 * The email HTML of a design.
 * `preview`: gray boxes for images without a picture (thumbnails and editors).
 * `selectable`: block IDs and outlines, for click-to-select in the editor.
 */
export function renderDesign(design: EmailDesign, opts: { preview?: boolean; selectable?: boolean } = {}) {
  const s = design.settings;
  const preview = Boolean(opts.preview);
  const selectable = Boolean(opts.selectable);
  const rows = design.blocks
    .map((b) => {
      const row = renderBlock(b, s, preview);
      return selectable ? row.replace(/^<tr/, `<tr data-mf-block="${b.id}"`) : row;
    })
    .join("\n");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<style>
  @media (max-width: ${s.width + 20}px) {
    .mf-container { width: 100% !important; }
    .mf-pad { padding-left: 20px !important; padding-right: 20px !important; }
  }${selectable ? PREVIEW_STYLE : ""}
</style>
</head>
<body style="margin:0;padding:0;background:${s.background};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${s.background};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="mf-container" width="${s.width}" cellpadding="0" cellspacing="0" border="0" style="width:${s.width}px;max-width:100%;background:${s.contentBackground};border-radius:8px;overflow:hidden;font-family:${FONTS[s.font].stack};color:${s.textColor};">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------- hints for the editor ----------
const EXAMPLE_LINK = /https?:\/\/(www\.)?example\.com/i;
/** The address in the footers of new designs. The editor asks people to change it. */
export const SAMPLE_ADDRESS = "Street 1 · 12345 City";

/** A short problem of one block that the editor shows next to it, or null. */
export function blockIssue(b: Block): string | null {
  switch (b.type) {
    case "button":
      if (safeHref(b.href) === "#") return "Add a link that starts with https://.";
      if (EXAMPLE_LINK.test(b.href)) return "Change the example.com link to your own page.";
      return null;
    case "image":
      if (!b.src.trim()) return "Add a picture link. Without a picture, the email leaves out this block.";
      if (!/^https?:\/\//i.test(b.src.trim())) return "The picture link must start with https://.";
      if (!b.alt.trim()) return "Add a short description. Some inboxes do not show pictures.";
      return null;
    case "footer":
      if (b.text.includes(SAMPLE_ADDRESS)) return "Change the sample address to the postal address of your company.";
      return EXAMPLE_LINK.test(b.text) ? "Change the example.com link to your own page." : null;
    case "text":
      return EXAMPLE_LINK.test(b.text) ? "Change the example.com link to your own page." : null;
    default:
      return null;
  }
}

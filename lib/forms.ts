// The design of a list's sign-up form. The hosted page, the embed code, and the preview all use it.
// Pure code: the browser (live preview) and the server use the same rules.

export type NameField = "off" | "optional" | "required";
export type FormDisplay = "inline" | "popup" | "slide_in";
export type IncentiveType = "standard" | "lead_magnet" | "discount_code" | "mystery_discount";

export type FormDesign = {
  title: string;
  text: string;
  button: string;
  nameField: NameField;
  success: string;
  color: string; // "#rrggbb", the button color
  display: FormDisplay;
  badgeText: string;
  incentiveType: IncentiveType;
  incentiveValue: string;
};

export const DEFAULT_COLOR = "#18181b";
export const DEFAULT_SUCCESS = "Thanks! Check your inbox and click the link to confirm your subscription.";
export const NAME_FIELDS: NameField[] = ["off", "optional", "required"];
export const FORM_DISPLAYS: FormDisplay[] = ["inline", "popup", "slide_in"];
export const INCENTIVE_TYPES: IncentiveType[] = ["standard", "lead_magnet", "discount_code", "mystery_discount"];
export const MAX_ORIGINS = 10;

const HEX = /^#[0-9a-f]{6}$/i;

type ListLike = {
  name: string;
  pageTitle?: string | null;
  pageText?: string | null;
  formButton?: string | null;
  formNameField?: string | null;
  formSuccess?: string | null;
  formColor?: string | null;
  formDisplay?: string | null;
  formBadgeText?: string | null;
  incentiveType?: string | null;
  incentiveValue?: string | null;
  formImpressions?: number | null;
  formSubmits?: number | null;
};

export function designOf(list: ListLike): FormDesign {
  return {
    title: list.pageTitle?.trim() || list.name,
    text: list.pageText?.trim() ?? "",
    button: list.formButton?.trim() || "Subscribe",
    nameField: NAME_FIELDS.includes(list.formNameField as NameField) ? (list.formNameField as NameField) : "optional",
    success: list.formSuccess?.trim() || DEFAULT_SUCCESS,
    color: HEX.test(list.formColor ?? "") ? list.formColor!.toLowerCase() : DEFAULT_COLOR,
    display: FORM_DISPLAYS.includes(list.formDisplay as FormDisplay) ? (list.formDisplay as FormDisplay) : "inline",
    badgeText: list.formBadgeText?.trim() ?? "",
    incentiveType: INCENTIVE_TYPES.includes(list.incentiveType as IncentiveType) ? (list.incentiveType as IncentiveType) : "standard",
    incentiveValue: list.incentiveValue?.trim() ?? "",
  };
}

/** The values to save from the design form. Empty text means "use the default". */
export function cleanDesign(get: (name: string) => string) {
  const line = (name: string, max: number) => get(name).replace(/[\r\n]+/g, " ").trim().slice(0, max);
  const nameField = get("formNameField");
  const color = get("formColor").trim();
  const display = get("formDisplay");
  const incentiveType = get("incentiveType");

  return {
    pageTitle: line("pageTitle", 120),
    pageText: get("pageText").trim().slice(0, 500),
    formButton: line("formButton", 40),
    formNameField: NAME_FIELDS.includes(nameField as NameField) ? nameField : "optional",
    formSuccess: line("formSuccess", 300),
    formColor: HEX.test(color) ? color.toLowerCase() : "",
    formDisplay: FORM_DISPLAYS.includes(display as FormDisplay) ? display : "inline",
    formBadgeText: line("formBadgeText", 80),
    incentiveType: INCENTIVE_TYPES.includes(incentiveType as IncentiveType) ? incentiveType : "standard",
    incentiveValue: line("incentiveValue", 500),
  };
}

/** Computes the conversion rate percentage. Returns rounded to 1 decimal place. */
export function conversionRateOf(submits: number, impressions: number): number {
  if (impressions <= 0 || submits <= 0) return 0;
  const rate = (submits / impressions) * 100;
  return Math.min(100, Math.round(rate * 10) / 10);
}

/** Black or white text, whichever is easier to read on `hex` (WCAG relative luminance). */
export function textColorOn(hex: string) {
  const c = HEX.test(hex) ? hex : DEFAULT_COLOR;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}

// The color of the success icon on a white card: the button color, or green if that is too light to see.
export const iconColorOn = (hex: string | undefined) =>
  hex && HEX.test(hex) && textColorOn(hex) === "#ffffff" ? hex : "#16a34a";

// ---------- the websites that may use a form key ----------
// "https://www.Example.com/page" -> "https://www.example.com"
export function normalizeOrigin(input: string): string | null {
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** One website per line (or comma). "example.com" without https:// is accepted too. */
export function parseOrigins(raw: string): { origins: string[]; error?: undefined } | { origins?: undefined; error: string } {
  const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { error: "Enter the address of your website, like https://www.example.com" };
  if (parts.length > MAX_ORIGINS) return { error: `You can add up to ${MAX_ORIGINS} websites.` };
  const origins: string[] = [];
  for (const p of parts) {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(p);
    const origin = hasScheme && !/^https?:\/\//i.test(p) ? null : normalizeOrigin(hasScheme ? p : `https://${p}`);
    const host = origin ? new URL(origin).hostname : "";
    // A real host has a dot (example.com), except "localhost" for tests on your own computer.
    if (!origin || (!host.includes(".") && host !== "localhost")) return { error: `"${p}" is not a website address.` };
    origins.push(origin);
  }
  return { origins: [...new Set(origins)] };
}

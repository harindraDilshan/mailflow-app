// Small pure rules for sign-up, log-in, and account security. Tested in auth-rules.test.ts.

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 256; // the Appwrite limit

// Passwords that attackers try first. Appwrite can check a longer list too ("Password dictionary").
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword", "12345678", "123456789",
  "1234567890", "12341234", "87654321", "11111111", "00000000", "qwertyui", "qwerty12", "qwerty123", "qwertyuiop",
  "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "asdfghjk", "asdf1234", "abc12345", "abcd1234", "aa123456", "iloveyou",
  "admin123", "administrator", "welcome1", "welcome123", "letmein1", "letmein123", "football", "baseball",
  "sunshine", "princess", "superman", "trustno1", "changeme", "monkey123", "dragon123", "master123",
  "mailflow", "mailflow1", "mailflow123",
]);

/**
 * Why a new password cannot be used, or null. The rules follow NIST SP 800-63B:
 * a minimum length, no known-bad passwords, no personal data, and no "must have a symbol" rules.
 */
export function passwordProblem(password: string, personal: { email?: string; name?: string } = {}): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "This password is too common. Choose a different one.";
  const local = personal.email?.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Do not use your email address in your password.";
  const first = personal.name?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first.length >= 4 && lower.includes(first)) return "Do not use your name in your password.";
  return null;
}

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/** A rough 0–4 score for the strength bar. The server only enforces passwordProblem. */
export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "" };
  if (password.length < MIN_PASSWORD || COMMON.has(password.toLowerCase())) return { score: 1, label: "Too weak" };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let score = password.length >= 16 ? 3 : password.length >= 12 ? 2 : 1;
  if (kinds >= 3) score++;
  if (new Set(password).size < password.length / 2) score--; // many repeated characters
  const s = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  return { score: s, label: ["", "Weak", "Fair", "Good", "Strong"][s] };
}

/**
 * Where to go after log-in. Only a path on this site is allowed, so a link like
 * /login?next=https://evil.example cannot send people to another site (open redirect).
 */
export function safeNext(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/^\/(login|signup|forgot-password|reset-password)(\/|\?|$)/.test(value)) return fallback;
  return value.slice(0, 500);
}

type AppwriteError = { type?: string; code?: number; message?: string };
const asError = (e: unknown): AppwriteError => (e && typeof e === "object" ? (e as AppwriteError) : {});

/** The password was right, but the account has 2-step verification: the session needs a code first. */
export const needsSecondFactor = (e: unknown) =>
  asError(e).type === "user_more_factors_required" || /more factors are required/i.test(asError(e).message ?? "");

/** Appwrite wants a fresh code from the user before this change. */
export const needsFreshCode = (e: unknown) =>
  asError(e).type === "user_challenge_required" || /challenge is required/i.test(asError(e).message ?? "");

/** True for "not logged in" errors. Other errors (Appwrite down) must not log the user out. */
export const isUnauthorized = (e: unknown) => asError(e).code === 401 || asError(e).code === 403;

const MESSAGES: Record<string, string> = {
  user_invalid_credentials: "Wrong email or password.",
  user_blocked: "This account is blocked. Contact support.",
  user_already_exists: "An account with this email already exists. Log in, or reset your password.",
  user_email_already_exists: "An account with this email already exists.",
  user_password_recently_used: "You used this password before. Choose a different one.",
  user_password_personal_data: "Do not use your name or email address in your password.",
  user_password_mismatch: "Your current password is wrong.",
  user_invalid_token: "This link or code is wrong or expired.",
  user_session_not_found: "This session has already ended.",
  general_rate_limit_exceeded: "Too many attempts. Wait a few minutes and try again.",
};

/** A short, safe message for a failed Appwrite auth call. It never shows internal details. */
export function authErrorMessage(e: unknown, fallback = "Something went wrong. Try again.") {
  const { type, code } = asError(e);
  if (type && MESSAGES[type]) return MESSAGES[type];
  if (code === 429) return MESSAGES.general_rate_limit_exceeded;
  return fallback;
}

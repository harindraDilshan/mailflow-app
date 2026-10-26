// The session cookie. No Next.js or Appwrite imports, so proxy.ts can use it cheaply.

const PRODUCTION = process.env.NODE_ENV === "production";

// "__Host-": the browser accepts the cookie only with Secure, Path=/ and no Domain,
// so no subdomain can set or replace it. It needs HTTPS, so development keeps the plain name.
export const SESSION_COOKIE = PRODUCTION ? "__Host-mailflow-session" : "mailflow-session";

/**
 * httpOnly: page scripts cannot read the session (XSS cannot steal it).
 * sameSite "lax": other sites cannot send it with their forms (CSRF), but links in emails still work.
 * Without `expires` the cookie ends when the browser closes ("Remember me" not checked).
 */
export function sessionCookieOptions(expires?: Date) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: PRODUCTION,
    ...(expires ? { expires } : {}),
  };
}

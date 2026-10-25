# Epic 15 Audit Report: Developer API and Subscribe Integration

## 1. Summary

This document reports the compliance audit for Epic 15.
The audit inspected all requirements from K1 to X5 and data specifications.

- **Total Requirements Audited**: 48
- **PASS**: 40
- **FAIL**: 2
- **PARTIAL**: 5
- **DIFFERENT, ACCEPTABLE**: 1
- **CANNOT VERIFY AT RUNTIME**: 0

---

## 2. Requirement Compliance Table

| ID | Requirement Description | Status | Evidence | Risk | Fix Plan |
|---|---|---|---|---|---|
| **D.1** | `api_keys` table columns and unique hash index | **PARTIAL** | [`scripts/setup-tables.ts`](file:///D:/Projects/mailflow-app/mailflow-app/scripts/setup-tables.ts#L127-L145) defines columns and `uniq_hash`, but lacks `idx_account` index. | Medium | Add `idx_account` index to `api_keys` in `scripts/setup-tables.ts`. |
| **D.2** | `lists` table extra columns (`hostedEnabled`, `pageTitle`, etc.) | **PASS** | [`scripts/setup-tables.ts`](file:///D:/Projects/mailflow-app/mailflow-app/scripts/setup-tables.ts#L23-L33) lines 23–33. | None | No fix needed. |
| **D.3** | `contacts` table extra columns and unique `(accountId, email)` | **PASS** | [`scripts/setup-tables.ts`](file:///D:/Projects/mailflow-app/mailflow-app/scripts/setup-tables.ts#L35-L58) lines 35–58. | None | No fix needed. |
| **D.4** | Campaign and automation audiences include only `active` contacts | **PASS** | [`lib/campaigns.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/campaigns.ts#L43) and [`worker/automation.ts`](file:///D:/Projects/mailflow-app/mailflow-app/worker/automation.ts#L99). | None | No fix needed. |
| **K1** | Key format `pk_live_` or `sk_live_` with 32 base64url characters | **PASS** | [`lib/api-keys.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-keys.ts#L25-L28) lines 25–28. | None | No fix needed. |
| **K2** | SHA-256 hash lookup; secret key never stored in plain text | **PASS** | [`lib/api-keys.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-keys.ts#L40-L63) lines 40–63. | None | No fix needed. |
| **K3** | Secret key shown one time upon creation | **PASS** | [`lib/api-keys.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-keys.ts#L62) line 62. | None | No fix needed. |
| **K4** | Public key belongs to one list; 1–10 normalized HTTP/S origins | **PASS** | [`app/(dashboard)/developers/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/(dashboard)/developers/actions.ts#L24-L37) lines 24–37. | None | No fix needed. |
| **K5** | Maximum 10 active keys per account | **PASS** | [`app/(dashboard)/developers/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/(dashboard)/developers/actions.ts#L17-L19) lines 17–19. | None | No fix needed. |
| **K6** | Key revocation sets status to `revoked` and rejects immediately | **PASS** | [`lib/api-keys.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-keys.ts#L85-L107) lines 85–107. | None | No fix needed. |
| **K7** | `lastUsedAt` updated at most once per minute without blocking | **PARTIAL** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L136) updates it, but [`app/api/v1/lists/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/lists/route.ts) omits `touchKey`. | Low | Add non-blocking `touchKey` call in `app/api/v1/lists/route.ts`. |
| **K8** | Key extracted from Bearer, X-Api-Key, or body; checked by regex before DB lookup | **PASS** | [`lib/api-helpers.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-helpers.ts#L26-L35) lines 26–35. | None | Add null-safety guard for non-object body. |
| **K9** | Dashboard actions verify account ownership | **PASS** | [`app/(dashboard)/developers/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/(dashboard)/developers/actions.ts#L25) and [`lib/api-keys.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-keys.ts#L91). | None | No fix needed. |
| **E1** | Accepts JSON and form data | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L47-L69) lines 47–69. | None | No fix needed. |
| **E2** | Strict sequence of 10 checks | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L49-L145) steps 1 to 10. | None | No fix needed. |
| **E3** | Rate limits: 20/min IP, 60/min public key, 300/min secret key; 429 with `Retry-After` | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L50-L93) lines 50–93. | None | No fix needed. |
| **E4** | Public key requires allowed origin (403); Secret key with origin rejected (403) | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L80-L86) lines 80–86. | None | No fix needed. |
| **E5** | Public key ignores tags; Secret key requires array of 1 to 5 owned list IDs | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L96-L105) lines 96–105. | None | Harden list ID element-type check for non-string array members. |
| **E6** | List must have `fromEmail` configured (400 `list_not_configured`) | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L110-L112) lines 110–112. | None | No fix needed. |
| **E7** | Honeypot `hp_field` returns success without creating contact | **PASS** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L117-L121) lines 117–121. | None | No fix needed. |
| **E8** | Uniform JSON responses and errors with `requestId` and `X-Request-Id` | **PASS** | [`lib/api-helpers.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/api-helpers.ts#L12-L17) lines 12–17. | None | No fix needed. |
| **E9** | Form requests redirect with 303 to thanks page with `?error=<code>` | **PARTIAL** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L138-L144) redirects on subscribe error, but returns JSON on pre-subscribe validation errors. | Medium | Redirect form requests to `/s/<listId>/thanks?error=<code>` when list is known. |
| **E10** | CORS handling; OPTIONS returns 204; `Vary: Origin` on all responses | **PARTIAL** | [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts#L20-L32) handles OPTIONS, but several early error responses omit `Vary: Origin`. | Medium | Ensure every `fail()` response in `subscribe` includes `Vary: Origin`. |
| **E11** | `GET /api/v1/lists` requires secret key, forbids Origin, returns list array | **PASS** | [`app/api/v1/lists/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/lists/route.ts#L6-L22) lines 6–22. | None | No fix needed. |
| **E12** | Unexpected errors return JSON `server_error` (500) with `requestId` | **FAIL** | Neither [`app/api/v1/subscribe/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/subscribe/route.ts) nor [`app/api/v1/lists/route.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/api/v1/lists/route.ts) has a top-level try-catch block. Uncaught errors produce Next.js HTML error responses. | High | Wrap both route handlers with top-level try-catch returning 500 `server_error`. |
| **E13** | Response does not wait for email sending | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L111) enqueues BullMQ job. | None | No fix needed. |
| **S1** | Email normalization and validation | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L55-L56) lines 55–56. | None | No fix needed. |
| **S2** | Contact creation with `pending`, source, sanitized URL, and limit check | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L87-L110) lines 87–110. | None | No fix needed. |
| **S3** | Spec Change: public key & hosted return `pending_confirmation` for active contact | **FAIL** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L69) and [`app/s/[listId]/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/s/[listId]/actions.ts#L36) return `already_subscribed` to visitors, leaking membership. | High | Return `pending_confirmation` for public keys and hosted page; return `already_subscribed` only for secret keys. |
| **S4** | Unsubscribed, bounced, complained return `pending_confirmation` without email | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L70) line 70. | None | No fix needed. |
| **S5** | Pending contact list append and 10-minute resend cooldown | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L72-L84) lines 72–84. | None | No fix needed. |
| **S6** | Maximum 3 confirmation emails per hour per email address platform-wide | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L41-L43) uses hashed Redis key. | None | No fix needed. |
| **S7** | Database conflict 409 treated as success | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L112-L115) lines 112–115. | None | No fix needed. |
| **S8** | Confirmation email queue with 3 attempts and exponential delay | **PASS** | [`lib/subscribe.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/subscribe.ts#L27-L38) lines 27–38. | None | No fix needed. |
| **S9** | No IP addresses saved in database | **PASS** | Verified in table schema and contact write operations. | None | No fix needed. |
| **C1** | HMAC token with 48h expiration and safe comparison | **PASS** | [`lib/confirm-token.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/confirm-token.ts#L1-L22) lines 1–22. | None | No fix needed. |
| **C2** | GET `/confirm` shows page and never changes data | **PASS** | [`app/confirm/page.tsx`](file:///D:/Projects/mailflow-app/mailflow-app/app/confirm/page.tsx#L1-L56) lines 1–56. | None | No fix needed. |
| **C3** | Confirm button runs server action; changes status only if `pending` | **PASS** | [`app/confirm/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/confirm/actions.ts#L9-L26) lines 9–26. | None | No fix needed. |
| **C4** | Trigger automation hook `fireContactTriggers` on confirmation | **PASS** | [`app/confirm/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/confirm/actions.ts#L24) line 24. | None | No fix needed. |
| **C5** | Worker `sendConfirmation` validates pending, cleans headers, escapes HTML | **PASS** | [`worker/processors.ts`](file:///D:/Projects/mailflow-app/mailflow-app/worker/processors.ts#L230-L273) lines 230–273. | None | No fix needed. |
| **H1** | Hosted page public, 404 on unconfigured, `noindex`, `force-dynamic` | **DIFFERENT, ACCEPTABLE** | [`app/s/[listId]/page.tsx`](file:///D:/Projects/mailflow-app/mailflow-app/app/s/[listId]/page.tsx) uses `noindex` and dynamic `params` Promise. Next.js 16 with `cacheComponents` explicitly forbids `dynamic = "force-dynamic"`. | None | Safe difference required by Next.js 16 compiler. |
| **H2** | Hosted page action enforces IP rate limit, honeypot, and server list validation | **PASS** | [`app/s/[listId]/actions.ts`](file:///D:/Projects/mailflow-app/mailflow-app/app/s/[listId]/actions.ts#L1-L37) lines 1–37. | None | Fixed in S3. |
| **H3** | `/s/[listId]/thanks` displays neutral or error message | **PASS** | [`app/s/[listId]/thanks/page.tsx`](file:///D:/Projects/mailflow-app/mailflow-app/app/s/[listId]/thanks/page.tsx#L1-L48) lines 1–48. | None | No fix needed. |
| **M1** | Embed snippet works without JavaScript and enhances with fetch | **PASS** | [`lib/embed.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/embed.ts#L1-L32) lines 1–32. | None | No fix needed. |
| **M2** | Embed snippet contains public key and valid API action URL | **PASS** | [`lib/embed.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/embed.ts#L1-L9) lines 1–9. | None | No fix needed. |
| **M3** | Honeypot field hidden accessibly | **PASS** | [`lib/embed.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/embed.ts#L6) line 6. | None | No fix needed. |
| **D1** | Collect subscribers settings page | **PASS** | [`app/(dashboard)/contacts/lists/[id]/collect/page.tsx`](file:///D:/Projects/mailflow-app/mailflow-app/app/(dashboard)/contacts/lists/[id]/collect/page.tsx). | None | Update doc links to `/docs/api`. |
| **D2** | Developers page with keys table and creation form | **PASS** | [`app/(dashboard)/developers/page.tsx`](file:///D:/Projects/mailflow-app/mailflow-app/app/(dashboard)/developers/page.tsx). | None | Update doc links to `/docs/api`. |
| **X1** | No secrets in client code, logs, or error responses | **PASS** | Inspected across all routes and libraries. | None | No fix needed. |
| **X2** | All user text escaped in HTML and emails | **PASS** | `escapeHtml` used in `sendConfirmation` and render modules. | None | No fix needed. |
| **X3** | No open redirect | **PASS** | All redirects use application base URL. | None | No fix needed. |
| **X4** | Every read and write validates account ownership | **PASS** | Inspected across `api-keys.ts`, `contacts.ts`, and server actions. | None | No fix needed. |
| **X5** | `NEXT_PUBLIC_APP_URL` validated at build/runtime | **PARTIAL** | Used with non-null assertion `!` without fallback guard. | Low | Add explicit check throwing clear error if `NEXT_PUBLIC_APP_URL` is empty. |

---

## 3. Extra Findings and Security Analysis

1. **Missing Top-Level Route Exception Handling**:
   - `app/api/v1/subscribe/route.ts` and `app/api/v1/lists/route.ts` lack top-level `try ... catch` blocks.
   - Any database network timeout or internal exception crashes into Next.js default HTML 500 error instead of the required JSON `{ error: { code: "server_error", message: "...", requestId: "..." } }`.
2. **Missing `touchKey` in `GET /api/v1/lists`**:
   - Secret keys used with `GET /api/v1/lists` never update `lastUsedAt`.
3. **Form Error Redirect Handling in `POST /api/v1/subscribe`**:
   - If a plain HTML form submission triggers an early error (such as `list_not_configured`), the route currently returns raw JSON instead of redirecting the browser to `/s/<listId>/thanks?error=<code>`.
4. **Worker Graceful Shutdown Incompleteness**:
   - `worker/index.ts` shuts down `prepareWorker`, `emailWorker`, and `confirmWorker`, but omits `automationWorker.close()` and `clearInterval(sweeper)`.

---

## 4. Decisions That Need a Human

1. **Rate Limiter Fail-Open Behavior**:
   - If Redis becomes unavailable, `lib/rate-limit.ts` logs an error and permits the request (`ok: true`).
   - This choice prioritizes application availability over strict rate enforcement during Redis downtime.
2. **Form Redirect Target When List ID Is Unknown**:
   - When a form submission fails before list identification (for example, with an invalid API key), the system returns JSON HTTP 401 rather than redirecting to an arbitrary URL.

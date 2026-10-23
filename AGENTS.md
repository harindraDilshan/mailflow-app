# AGENTS.md — Mailflow App

Guidance for AI coding agents working in this repository.

---

## Repository Overview

Mailflow is a self-hosted email-marketing platform built with **Next.js 16 (App Router)**, **Appwrite** (auth + TablesDB), **BullMQ + Redis** (job queues), and **AWS SES / Nodemailer SMTP** (email delivery).

The codebase runs as two long-lived processes:

| Process | Entry point | Start command |
|---|---|---|
| Next.js web server | `app/` | `npm run dev` |
| Background worker | `worker/index.ts` | `npm run worker` |

---

## Directory Layout

```
app/                  Next.js App Router pages and API routes
  (auth)/             Login, signup, forgot/reset-password
  (dashboard)/        Authenticated dashboard pages
    automations/
    campaigns/
    contacts/
    developers/
    domains/
  api/
    unsubscribe/      Public unsubscribe route
    v1/               REST API (lists, subscribe)
  s/[listId]/         Public hosted subscribe form
  t/c/[token]/        Click-tracking redirect
  t/o/[token]/        Open-tracking pixel
  confirm/            Double-opt-in confirmation
  unsubscribe/        Unsubscribe landing page
  verify/             Email verification
components/           Shared React components
lib/                  Pure business logic (no Next.js imports)
  appwrite/           Appwrite client helpers (admin.ts, server.ts, db.ts)
  aws/ses.ts          SES client wrapper
  email/              Email provider abstraction + rendering + tests
  *.ts                Domain modules (campaigns, contacts, automations, …)
worker/               Long-running BullMQ workers
  index.ts            Worker entry point (SIGINT/SIGTERM shutdown)
  processors.ts       Job handlers: prepareCampaign, sendEmail, …
  automation.ts       Automation trigger/step logic
  ses-events.ts       SES SNS event consumer
scripts/              One-off CLI scripts (run with tsx, never imported)
```

---

## Environment Setup

Copy `.env` and fill in real values (the committed `.env` contains **real credentials** — do **not** commit changes to it):

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

APPWRITE_DATABASE_ID=
APPWRITE_DOMAINS_TABLE_ID=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

EMAIL_PROVIDER=smtp          # smtp | ses
SMTP_HOST=localhost
SMTP_PORT=1025
REDIS_URL=redis://localhost:6379

SEND_RATE_PER_SECOND=10
SEND_CONCURRENCY=5
DAILY_SEND_LIMIT=5000
REQUIRE_VERIFIED_DOMAIN=false   # set true in production

UNSUBSCRIBE_SECRET=<random string>
TRACKING_SECRET=<random string>
TRACKING_ENABLED=true
```

Start local dependencies (Redis + MailHog SMTP test inbox):

```bash
docker compose up -d
```

---

## Install & Run

```bash
npm install
```

### Development

```bash
# Terminal 1 — Next.js dev server (http://localhost:3000)
npm run dev

# Terminal 2 — background worker
npm run worker
```

### Production

```bash
npm run build
npm run start
# run worker separately with: npm run worker
```

---

## Database Setup

Tables live in Appwrite TablesDB. The setup script is idempotent — it only creates what is missing.

```bash
# First time: create all tables
npm run db:setup

# Wipe all tables and recreate (destructive — 5 s countdown)
npm run db:reset
```

Tables managed: `lists`, `contacts`, `campaigns`, `messages`, `events`, `api_keys`, `domains`, `automations`, `automation_runs`.

---

## npm Scripts

| Script | Command | Notes |
|---|---|---|
| `dev` | `next dev` | Turbopack + `@tailwindcss/turbopack` |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the production build |
| `lint` | `eslint` | ESLint 9 flat config (Next.js core-web-vitals + TypeScript preset) |
| `test` | `vitest run` | Single pass; exits 0 on success |
| `test:watch` | `vitest` | Interactive watch mode |
| `worker` | `tsx --env-file=.env worker/index.ts` | Requires running Redis |
| `db:setup` | `tsx --env-file=.env scripts/setup-tables.ts` | Idempotent table setup |
| `db:reset` | `tsx --env-file=.env scripts/setup-tables.ts --reset` | **Destructive** |
| `seed` | `tsx --env-file=.env scripts/seed-contacts.ts` | Seed sample contacts |
| `seed:clean` | `tsx --env-file=.env scripts/seed-clean.ts` | Remove seeded data |
| `simulate` | `tsx --env-file=.env scripts/simulate-activity.ts` | Simulate events |
| `generate-csv` | `tsx scripts/generate-contacts-csv.ts` | No `.env` needed |
| `unsub-link` | `tsx --env-file=.env scripts/unsubscribe-link.ts` | Generate unsub URL |

> [!IMPORTANT]
> Scripts that talk to external services (`worker`, `db:setup`, `seed`, `simulate`, …) require `--env-file=.env` and a reachable Appwrite endpoint + Redis instance. Do not run them in CI without the required secrets.

---

## Testing

**Framework:** Vitest 5, `environment: "node"`.  
**Path alias:** `@` resolves to the repository root (matches `tsconfig.json`).

### Run tests

```bash
npm run test          # single run (CI)
npm run test:watch    # watch mode (development)
```

### Test files

Tests live **next to the code they test**, named `*.test.ts`:

| Test file | What it covers |
|---|---|
| [`lib/contact-rules.test.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/contact-rules.test.ts) | `normalizeEmail`, `isValidEmail`, `normalizeTags` |
| [`lib/email/render.test.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/email/render.test.ts) | `renderEmail` link tracking, `extractLinks` dedup |

All 4 tests pass (`vitest run` exits 0). Tests run in a plain Node environment — no DOM, no Next.js server, no real credentials needed.

### Writing new tests

- Place tests in `lib/` or `worker/` beside the module, named `<module>.test.ts`.
- Import from `vitest`: `import { it, expect, describe } from "vitest"`.
- Do not start Redis, call Appwrite, or send real email from a test. Mock or unit-test pure functions only.

---

## Linting

**Config:** [`eslint.config.mjs`](file:///D:/Projects/mailflow-app/mailflow-app/eslint.config.mjs) — ESLint 9 flat config extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`.

```bash
npm run lint
```

> [!NOTE]
> `npm run lint` can take over a minute on first run due to ESLint's cold-start analysis of the whole project. This is normal.

---

## TypeScript

**Config:** [`tsconfig.json`](file:///D:/Projects/mailflow-app/mailflow-app/tsconfig.json)

- `strict: true` — all strict checks enabled.
- `noEmit: true` — TypeScript is type-check only; Next.js/Turbopack handles compilation.
- `moduleResolution: "bundler"` — use bundler-style imports (no `.js` extensions needed).
- Path alias `@/*` → `./*` (repo root).

Type-check without building:

```bash
npx tsc --noEmit
```

---

## Code Conventions

### General

- **TypeScript everywhere.** No `.js` files in `app/`, `lib/`, `worker/`, or `components/`.
- **Strict mode** is on. Avoid `any`; if unavoidable, cast via `as unknown as T`.
- **No `.js` extension on imports.** Use `"@/lib/foo"` not `"@/lib/foo.js"`.

### `lib/` — pure business logic

- Modules in `lib/` must not import from `next/` (no `cookies`, `headers`, `redirect`, etc.) except within `lib/appwrite/server.ts`.
- Each module exports typed functions and types. Keep side effects out of module scope.
- The email provider interface is in [`lib/email/provider.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/email/provider.ts). Add new providers by implementing `EmailProvider`. Switch providers via `EMAIL_PROVIDER` env var (resolved in `lib/email/index.ts`).

### `app/` — Next.js App Router

- Route groups: `(auth)` (unauthenticated), `(dashboard)` (authenticated).
- Authentication guard: call `requireUser()` from `lib/auth.ts` at the top of any Server Component or Server Action that needs a logged-in user. It redirects to `/login` automatically.
- **Server Actions** live in `actions.ts` files co-located with their route. Mark them `"use server"`.
- **Client components** are files with `"use client"` at the top; keep them in `components/` or co-located as `*-form.tsx` / `*-wizard.tsx`.

### `worker/`

- The worker runs as a standalone Node process via `tsx`.
- Workers are created with `bullmq`'s `Worker` class. Concurrency and rate limits are read from env vars at startup.
- Always register `worker.on("error", ...)` and `worker.on("failed", ...)` handlers.
- Add graceful shutdown handling: call `worker.close()` in the `shutdown()` function.

### Database access

- Use `createAdminClient()` from `lib/appwrite/admin.ts` in server-side code that needs unrestricted DB access (Server Actions, worker).
- Use `createSessionClient()` from `lib/appwrite/server.ts` for user-scoped queries (the Appwrite SDK enforces row-level security).
- Table IDs and the database ID are constants in [`lib/appwrite/db.ts`](file:///D:/Projects/mailflow-app/mailflow-app/lib/appwrite/db.ts). Never hard-code them elsewhere.

### Branching

The main integration branch is `develop`. Feature branches follow the pattern `feature/rq-<N>-<slug>`. Merge via pull request.

---

## Key External Services

| Service | Purpose | Local alternative |
|---|---|---|
| Appwrite Cloud | Auth + database (TablesDB) | No local alternative; use the cloud project |
| AWS SES | Production email sending + SNS bounce/complaint events | Set `EMAIL_PROVIDER=smtp` for local dev |
| Redis 7 | BullMQ job queues | `docker compose up -d redis` |
| MailHog | Local SMTP sink + web inbox | `docker compose up -d mailhog` (inbox at `http://localhost:8025`) |

---

## What Agents Should NOT Do

- Do not commit changes to `.env` or any file containing real secrets.
- Do not run `npm run db:reset` unless explicitly asked — it is **destructive and irreversible**.
- Do not call `seed`, `simulate`, or `unsub-link` scripts without a confirmed test environment.
- Do not bypass the `requireUser()` / `getLoggedInUser()` auth guards.
- Do not add server-only imports (`next/headers`, `next/navigation`, etc.) inside `lib/` modules other than `lib/appwrite/server.ts`.
- Do not add a DOM or jsdom test environment — tests run in `node` environment only.

## Output Rules
- Always write output in ASD-STE100 (Simplified Technical English).  
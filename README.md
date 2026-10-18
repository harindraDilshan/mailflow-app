# Mailflow

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – start the dev server
- `npm run build` – production build
- `npm run start` – run the production build
- `npm run lint` – lint the project

---

# Email Marketing Platform: User Stories

Simple format: **As a [who], I want [what], so that [why].**
Each story has a short list of "Done when" points (acceptance criteria).

**Priority:** `P1` = must have for first version (MVP), `P2` = after launch, `P3` = later.

---

## Roles

- **Customer (Owner):** the person who pays and uses the platform.
- **Team Member:** a person invited by the owner.
- **Contact (Subscriber):** the person who receives emails.
- **Admin:** you and your team, running the platform.
- **System:** automatic actions done by the platform.

---

## Epic 1: Account and Login

### US-1.1 Sign up `P1`
As a **customer**, I want to create an account with my email and password, so that I can start using the platform.
- Done when: I get a verification email and can log in after verifying.
- Done when: weak passwords and used emails are rejected with a clear message.

### US-1.2 Log in and log out `P1`
As a **customer**, I want to log in and out safely, so that my data stays private.
- Done when: wrong passwords show an error, and many wrong tries are temporarily blocked.

### US-1.3 Reset password `P1`
As a **customer**, I want to reset my password by email, so that I can get back in if I forget it.
- Done when: the reset link works once and expires after a short time.

---
### this deletes your old contacts and lists tables and creates all four
npm run db:reset

### After the first time only creates what is missing.
npm run db:setup
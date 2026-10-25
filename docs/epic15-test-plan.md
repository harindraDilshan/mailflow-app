# Epic 15 Manual Test Plan

This document describes manual verification steps for the Subscriber Integration and Developer API feature.
Use this test plan to verify features that automated scripts cannot check directly.

---

## Prerequisites

1. Start local dependencies:
   ```bash
   docker compose up -d
   ```
2. Start the web application:
   ```bash
   npm run dev
   ```
3. Start the background queue worker:
   ```bash
   npm run worker
   ```
4. Open the local email inbox (MailHog) at [http://localhost:8025](http://localhost:8025).

---

## Test Cases

### 1. Hosted Subscribe Page (`/s/[listId]`)

1. Open the Mailflow dashboard: [http://localhost:3000](http://localhost:3000).
2. Go to **Audience → Lists**. Open or create a subscriber list.
3. Open **Hosted Form** under list actions.
4. Configure sender name (`Support`) and sender email address (`support@example.com`).
5. Select **Enable hosted subscribe page** and click **Save**.
6. Click the hosted URL link: `http://localhost:3000/s/<listId>`.
7. **Verification**:
   - The page displays the list title and description.
   - The robots meta tag is `noindex`.
   - Submit an invalid email address (for example: `invalid-email`). Verify that an error message appears.
   - Submit a valid email address (for example: `test-hosted@example.com`). Verify that the success message appears.

---

### 2. Confirmation Email in MailHog

1. Open MailHog at [http://localhost:8025](http://localhost:8025).
2. Find the confirmation email sent to `test-hosted@example.com`.
3. **Verification**:
   - The email sender matches the list configuration (`Support <support@example.com>`).
   - The subject line contains the list name without line breaks or invalid characters.
   - The HTML message body contains the confirmation link.

---

### 3. Subscription Confirmation Button

1. In MailHog, copy the confirmation link or click it.
2. The browser opens `http://localhost:3000/confirm?t=<token>`.
3. **Verification**:
   - The page displays the masked email address (for example: `t***@example.com`).
   - Merely loading the page with GET does **not** activate the contact.
4. Click **Yes, subscribe me**.
5. The browser redirects to `/confirm/done`.
6. Open the Mailflow dashboard at **Audience → Contacts**.
7. **Verification**:
   - The contact status is now `active`.
   - The contact displays `consentAt` timestamp and source `hosted`.

---

### 4. Embed Form in Browser (Without JavaScript)

1. In the dashboard, go to **API & Developers**.
2. Create a public key for your list with allowed origin `http://localhost:3000`.
3. Go to **Lists → Collect subscribers** and copy the embed snippet.
4. Create a test file `test-embed.html` or disable JavaScript in browser settings.
5. Submit the form with email `no-js-user@example.com`.
6. **Verification**:
   - The browser performs a native POST to `/api/v1/subscribe`.
   - The server answers with HTTP 303 redirect.
   - The browser arrives at `/s/<listId>/thanks`.
   - A confirmation email appears in MailHog.

---

### 5. Embed Form in Browser (With JavaScript Enabled)

1. Open the page containing the embed snippet in a browser with JavaScript enabled.
2. Fill out the form with `js-user@example.com` and click **Subscribe**.
3. **Verification**:
   - The page does not reload.
   - The paragraph `#exlorian-msg` displays: `Check your email to confirm your subscription.`
   - The input fields reset automatically.

---

### 6. CORS Verification in Browser Developer Tools

1. Open the browser Developer Tools (press F12) and switch to the **Console** tab.
2. On an unapproved website (for example, on `https://google.com`), paste:
   ```javascript
   fetch("http://localhost:3000/api/v1/subscribe", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ key: "YOUR_PUBLIC_KEY", email: "cors@example.com" })
   });
   ```
3. **Verification**:
   - The console reports a CORS error: `origin_not_allowed`.
   - The response status is HTTP 403.
   - No `Access-Control-Allow-Origin` header is returned to unapproved origins.

---

### 7. API Key Revocation

1. In the dashboard, go to **API & Developers**.
2. Find an active key in the table and click **Revoke**.
3. Confirm that the status badge updates to `revoked`.
4. In terminal, make an API request with the revoked key:
   ```bash
   curl -X GET http://localhost:3000/api/v1/lists -H "Authorization: Bearer <REVOKED_SECRET_KEY>"
   ```
5. **Verification**:
   - The server answers with HTTP 401.
   - The error code is `invalid_key`.
   - The revoked key is permanently inactive.

/**
 * Integration test script for the Mailflow Subscribe & Developer API.
 * Calls a running development server.
 *
 * Environment variables:
 * - BASE_URL: default http://localhost:3000
 * - TEST_PUBLIC_KEY: a valid public key (pk_live_...)
 * - TEST_SECRET_KEY: a valid secret key (sk_live_...)
 * - TEST_LIST_ID: an existing list ID owned by the account
 * - TEST_ORIGIN: the allowed origin configured for TEST_PUBLIC_KEY (e.g. http://localhost:3000)
 */

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PUBLIC_KEY = process.env.TEST_PUBLIC_KEY || "";
const SECRET_KEY = process.env.TEST_SECRET_KEY || "";
const LIST_ID = process.env.TEST_LIST_ID || "";
const ALLOWED_ORIGIN = process.env.TEST_ORIGIN || "http://localhost:3000";

let passed = 0;
let failed = 0;
let skipped = 0;

function errStr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function report(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.log(`[FAIL] ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

function skip(name: string, reason: string) {
  skipped++;
  console.log(`[SKIP] ${name} (${reason})`);
}

async function runTests() {
  console.log(`Running Subscribe API integration tests against: ${BASE_URL}\n`);

  // Check server reachability first
  try {
    const ping = await fetch(`${BASE_URL}/api/v1/subscribe`, { method: "OPTIONS" });
    if (!ping) throw new Error("No response");
  } catch {
    console.error(`ERROR: Target server at ${BASE_URL} is not reachable. Start the dev server first with: npm run dev\n`);
    process.exit(1);
  }

  // 1. Preflight OPTIONS: 204 with correct CORS headers
  try {
    const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
      method: "OPTIONS",
      headers: { Origin: ALLOWED_ORIGIN },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    const allowMethods = res.headers.get("access-control-allow-methods");
    const allowHeaders = res.headers.get("access-control-allow-headers");
    const ok =
      res.status === 204 &&
      allowOrigin === ALLOWED_ORIGIN &&
      (allowMethods?.includes("POST") ?? false) &&
      (allowHeaders?.includes("Authorization") ?? false);
    report("1. Preflight OPTIONS returns 204 with CORS headers", ok, `status=${res.status}`);
  } catch (e: unknown) {
    report("1. Preflight OPTIONS returns 204 with CORS headers", false, errStr(e));
  }

  // 2. No key: 401 invalid_key
  try {
    const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test-nokey@example.com" }),
    });
    const data = (await res.json()) as { error?: { code?: string } };
    const ok = res.status === 401 && data?.error?.code === "invalid_key";
    report("2. No key returns 401 invalid_key", ok, `status=${res.status}, code=${data?.error?.code}`);
  } catch (e: unknown) {
    report("2. No key returns 401 invalid_key", false, errStr(e));
  }

  // 3. Wrong key: 401 invalid_key
  try {
    const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer sk_live_wrongkey1234567890abcdef123456",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test-wrongkey@example.com" }),
    });
    const data = (await res.json()) as { error?: { code?: string } };
    const ok = res.status === 401 && data?.error?.code === "invalid_key";
    report("3. Wrong key format or unknown key returns 401 invalid_key", ok, `status=${res.status}`);
  } catch (e: unknown) {
    report("3. Wrong key format or unknown key returns 401 invalid_key", false, errStr(e));
  }

  // Tests that require SECRET_KEY and LIST_ID
  if (SECRET_KEY && LIST_ID) {
    const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;

    // 4. Secret key, valid email: 200 pending_confirmation
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: uniqueEmail,
          name: "Integration Test User",
          tags: ["test"],
          listIds: [LIST_ID],
        }),
      });
      const data = (await res.json()) as { status?: string };
      const ok = res.status === 200 && data?.status === "pending_confirmation";
      report("4. Secret key with valid email returns 200 pending_confirmation", ok, `status=${res.status}, result=${data?.status}`);
    } catch (e: unknown) {
      report("4. Secret key with valid email returns 200 pending_confirmation", false, errStr(e));
    }

    // 5. Same email again with secret key: still pending_confirmation
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: uniqueEmail,
          listIds: [LIST_ID],
        }),
      });
      const data = (await res.json()) as { status?: string };
      const ok = res.status === 200 && data?.status === "pending_confirmation";
      report("5. Same pending email again returns 200 pending_confirmation", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("5. Same pending email again returns 200 pending_confirmation", false, errStr(e));
    }

    // 6. Invalid email with secret key: 400 invalid_email
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "not-an-email",
          listIds: [LIST_ID],
        }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 400 && data?.error?.code === "invalid_email";
      report("6. Invalid email returns 400 invalid_email", ok, `status=${res.status}, code=${data?.error?.code}`);
    } catch (e: unknown) {
      report("6. Invalid email returns 400 invalid_email", false, errStr(e));
    }

    // 7. Secret key with Origin header: 403 secret_key_in_browser
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Origin": ALLOWED_ORIGIN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "browser-secret@example.com",
          listIds: [LIST_ID],
        }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 403 && data?.error?.code === "secret_key_in_browser";
      report("7. Secret key with Origin header returns 403 secret_key_in_browser", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("7. Secret key with Origin header returns 403 secret_key_in_browser", false, errStr(e));
    }

    // 8. Secret key with foreign/fake list ID: 400 list_not_found
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "fake-list@example.com",
          listIds: ["non_existent_fake_list_99999"],
        }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 400 && data?.error?.code === "list_not_found";
      report("8. Secret key with unknown or unowned listId returns 400 list_not_found", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("8. Secret key with unknown or unowned listId returns 400 list_not_found", false, errStr(e));
    }

    // 9. listIds as string (wrong type): 400 list_not_found (no crash)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "wrong-type@example.com",
          listIds: LIST_ID, // string instead of array
        }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 400 && data?.error?.code === "list_not_found";
      report("9. Non-array listIds yields clean 400 list_not_found without crash", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("9. Non-array listIds yields clean 400 list_not_found without crash", false, errStr(e));
    }

    // 10. Honeypot filled: 200 without creating contact
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "bot-trap@example.com",
          listIds: [LIST_ID],
          hp_field: "I am a spam bot",
        }),
      });
      const data = (await res.json()) as { status?: string };
      const ok = res.status === 200 && data?.status === "pending_confirmation";
      report("10. Honeypot filled returns 200 pending_confirmation", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("10. Honeypot filled returns 200 pending_confirmation", false, errStr(e));
    }

    // 11. GET /api/v1/lists with secret key: 200
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lists`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SECRET_KEY}` },
      });
      const data = (await res.json()) as { lists?: unknown[] };
      const ok = res.status === 200 && Array.isArray(data?.lists);
      report("11. GET /api/v1/lists with secret key returns 200 and lists array", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("11. GET /api/v1/lists with secret key returns 200 and lists array", false, errStr(e));
    }
  } else {
    skip("4. Secret key valid email", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("5. Same pending email", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("6. Invalid email", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("7. Secret key with Origin", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("8. Foreign listId", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("9. Non-array listIds", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("10. Honeypot filled", "TEST_SECRET_KEY and TEST_LIST_ID not provided");
    skip("11. GET /api/v1/lists with secret key", "TEST_SECRET_KEY not provided");
  }

  // Tests that require PUBLIC_KEY
  if (PUBLIC_KEY) {
    // 12. Public key without Origin: 403 origin_not_allowed
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: PUBLIC_KEY, email: "no-origin@example.com" }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 403 && data?.error?.code === "origin_not_allowed";
      report("12. Public key without Origin returns 403 origin_not_allowed", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("12. Public key without Origin returns 403 origin_not_allowed", false, errStr(e));
    }

    // 13. Public key with wrong Origin: 403 origin_not_allowed
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://malicious-unapproved-site.com",
        },
        body: JSON.stringify({ key: PUBLIC_KEY, email: "wrong-origin@example.com" }),
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 403 && data?.error?.code === "origin_not_allowed";
      report("13. Public key with wrong Origin returns 403 origin_not_allowed", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("13. Public key with wrong Origin returns 403 origin_not_allowed", false, errStr(e));
    }

    // 14. Public key with correct Origin: 200 OK
    try {
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": ALLOWED_ORIGIN,
        },
        body: JSON.stringify({
          key: PUBLIC_KEY,
          email: `pub_${Date.now()}@example.com`,
          name: "Public Key Tester",
        }),
      });
      const data = (await res.json()) as { status?: string };
      const ok = res.status === 200 && data?.status === "pending_confirmation";
      report("14. Public key with allowed Origin returns 200 pending_confirmation", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("14. Public key with allowed Origin returns 200 pending_confirmation", false, errStr(e));
    }

    // 15. GET /api/v1/lists with public key: 401 invalid_key
    try {
      const res = await fetch(`${BASE_URL}/api/v1/lists`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${PUBLIC_KEY}` },
      });
      const data = (await res.json()) as { error?: { code?: string } };
      const ok = res.status === 401 && data?.error?.code === "invalid_key";
      report("15. GET /api/v1/lists with public key returns 401 invalid_key", ok, `status=${res.status}`);
    } catch (e: unknown) {
      report("15. GET /api/v1/lists with public key returns 401 invalid_key", false, errStr(e));
    }

    // 16. Form-encoded request: 303 redirect
    try {
      const fd = new URLSearchParams();
      fd.append("key", PUBLIC_KEY);
      fd.append("email", `form_${Date.now()}@example.com`);
      const res = await fetch(`${BASE_URL}/api/v1/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": ALLOWED_ORIGIN,
        },
        body: fd.toString(),
        redirect: "manual",
      });
      const location = res.headers.get("location");
      const ok = (res.status === 303 || res.status === 302) && (location?.includes("/thanks") ?? false);
      report("16. Form-encoded request returns 303 redirect to /thanks", ok, `status=${res.status}, location=${location}`);
    } catch (e: unknown) {
      report("16. Form-encoded request returns 303 redirect to /thanks", false, errStr(e));
    }
  } else {
    skip("12. Public key without Origin", "TEST_PUBLIC_KEY not provided");
    skip("13. Public key with wrong Origin", "TEST_PUBLIC_KEY not provided");
    skip("14. Public key with allowed Origin", "TEST_PUBLIC_KEY not provided");
    skip("15. GET /lists with public key", "TEST_PUBLIC_KEY not provided");
    skip("16. Form-encoded 303 redirect", "TEST_PUBLIC_KEY not provided");
  }

  // 17. GET /confirm?t=garbage: returns page without crash or data mutation
  try {
    const res = await fetch(`${BASE_URL}/confirm?t=invalid.garbage.token`);
    const ok = res.status === 200;
    const body = await res.text();
    const clean = ok && (body.includes("invalid") || body.includes("expired") || body.includes("Confirm"));
    report("17. GET /confirm with invalid token returns page safely without crash", clean, `status=${res.status}`);
  } catch (e: unknown) {
    report("17. GET /confirm with invalid token returns page safely without crash", false, errStr(e));
  }

  // Summary
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  if (failed > 0) process.exit(1);
}

runTests();

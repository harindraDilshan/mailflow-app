import { after, NextRequest, NextResponse } from "next/server";
import { filterOwnedListIds } from "@/lib/contacts";
import { normalizeTags } from "@/lib/contact-rules";
import { normalizeOrigin, touchKey } from "@/lib/api-keys";
import { rateLimit } from "@/lib/rate-limit";
import { getList, subscribeEmail } from "@/lib/subscribe";
import { clientIp, corsHeaders, fail, keyFromRequest, requestId } from "@/lib/api-helpers";

const APP = process.env.NEXT_PUBLIC_APP_URL!;

const MESSAGES = {
  pending_confirmation: "Check your email to confirm your subscription.",
  already_subscribed: "You are already subscribed.",
};
const ERRORS = {
  invalid_email: "Enter a valid email address.",
  contact_limit_reached: "This account has reached its contact limit.",
};

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}

function cleanUrl(value: string | null) {
  try {
    if (!value) return undefined;
    const u = new URL(value);
    return u.origin + u.pathname; // no query string: it may contain personal data
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const rid = requestId();
  const origin = req.headers.get("origin");
  const isForm = !(req.headers.get("content-type") ?? "").includes("application/json");

  // 1. Limit by visitor address before doing any work.
  const ipLimit = await rateLimit("subscribe-ip", clientIp(req.headers), 20, 60);
  if (!ipLimit.ok) {
    return fail(429, "rate_limited", "Too many requests. Try again later.", rid, {
      "Retry-After": String(ipLimit.retryAfter),
    });
  }

  // 2. Read the body (JSON, or a normal HTML form).
  let body: Record<string, unknown> = {};
  try {
    if (isForm) {
      const fd = await req.formData();
      fd.forEach((v, k) => { if (typeof v === "string") body[k] = v; });
    } else {
      const json = await req.json();
      if (json && typeof json === "object") body = json as Record<string, unknown>;
    }
  } catch {
    return fail(400, "invalid_request", "The request could not be read.", rid);
  }

  // 3. Check the key and where the request comes from.
  const key = await keyFromRequest(req, body);
  if (!key) return fail(401, "invalid_key", "The API key is missing, wrong, or revoked.", rid);

  const normalized = origin ? normalizeOrigin(origin) : null;
  const allowedOrigin =
    key.type === "public" && !!normalized && (key.allowedOrigins ?? []).includes(normalized);
  const cors = corsHeaders(origin, allowedOrigin);

  if (key.type === "secret" && origin) {
    return fail(403, "secret_key_in_browser",
      "Secret keys cannot be used from a browser. Use a public key, or call the API from your server.", rid);
  }
  if (key.type === "public" && !allowedOrigin) {
    return fail(403, "origin_not_allowed", "This website is not allowed to use this key.", rid);
  }

  const keyLimit = await rateLimit("subscribe-key", key.$id, key.type === "public" ? 60 : 300, 60);
  if (!keyLimit.ok) {
    return fail(429, "rate_limited", "Too many requests for this key.", rid, {
      ...cors, "Retry-After": String(keyLimit.retryAfter),
    });
  }

  // 4. Which list? A public key has exactly one. A secret key says which.
  let listIds: string[];
  if (key.type === "public") {
    listIds = key.listId ? [key.listId] : [];
  } else {
    const asked = Array.isArray(body.listIds) ? [...new Set(body.listIds.map(String))].slice(0, 5) : [];
    listIds = await filterOwnedListIds(key.accountId, asked);
    if (asked.length === 0 || listIds.length !== asked.length) {
      return fail(400, "list_not_found", "Send listIds with the IDs of your own lists.", rid, cors);
    }
  }
  const list = listIds[0] ? await getList(listIds[0]) : null;
  if (!list || list.accountId !== key.accountId) {
    return fail(400, "list_not_found", "The list was not found.", rid, cors);
  }
  if (!list.fromEmail) {
    return fail(400, "list_not_configured", "Set a confirmation sender for this list first.", rid, cors);
  }

  const thanks = (query = "") => NextResponse.redirect(`${APP}/s/${list.$id}/thanks${query}`, 303);

  // 5. Hidden trap field: bots fill it, people never see it. Pretend it worked.
  if (typeof body.hp_field === "string" && body.hp_field.trim() !== "") {
    return isForm
      ? thanks()
      : NextResponse.json({ status: "pending_confirmation", message: MESSAGES.pending_confirmation }, { headers: cors });
  }

  // 6. Do it.
  const result = await subscribeEmail({
    accountId: key.accountId,
    listIds,
    email: typeof body.email === "string" ? body.email : "",
    name: typeof body.name === "string" ? body.name : "",
    // Only secret keys may set tags. Visitors cannot tag themselves.
    tags: key.type === "secret" && Array.isArray(body.tags) ? normalizeTags(body.tags.map(String)) : [],
    source: key.type === "public" ? "form" : "api",
    sourceUrl: key.type === "public" ? cleanUrl(req.headers.get("referer")) ?? origin ?? undefined : undefined,
    keyId: key.$id,
  });

  after(() => touchKey(key));

  if (!result.ok) {
    return isForm
      ? thanks(`?error=${result.code}`)
      : fail(result.code === "invalid_email" ? 400 : 403, result.code, ERRORS[result.code], rid, cors);
  }
  return isForm
    ? thanks()
    : NextResponse.json({ status: result.status, message: MESSAGES[result.status] }, { headers: cors });
}
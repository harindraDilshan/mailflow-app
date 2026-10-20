import { NextRequest, NextResponse } from "next/server";
import { listOwnedLists } from "@/lib/contacts";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, fail, keyFromRequest, requestId } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const rid = requestId();

  const limit = await rateLimit("lists-ip", clientIp(req.headers), 60, 60);
  if (!limit.ok) {
    return fail(429, "rate_limited", "Too many requests.", rid, { "Retry-After": String(limit.retryAfter) });
  }

  const key = await keyFromRequest(req, {});
  if (!key || key.type !== "secret") return fail(401, "invalid_key", "A secret key is required.", rid);
  if (req.headers.get("origin")) {
    return fail(403, "secret_key_in_browser", "Secret keys cannot be used from a browser.", rid);
  }

  const lists = await listOwnedLists(key.accountId);
  return NextResponse.json({ lists: lists.map((l) => ({ id: l.$id, name: l.name })) });
}
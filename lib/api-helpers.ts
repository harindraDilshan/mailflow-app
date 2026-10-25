import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { findKeyByPlain } from "@/lib/api-keys";

export const requestId = () => "req_" + randomBytes(8).toString("hex");

export function clientIp(headers: Headers) {
  // Behind your host's proxy this header holds the visitor's address.
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

export function fail(status: number, code: string, message: string, rid: string, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { error: { code, message, requestId: rid } },
    { status, headers: { Vary: "Origin", ...headers, "X-Request-Id": rid } }
  );
}

export function corsHeaders(origin: string | null, allowed: boolean): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

// The key can come from "Authorization: Bearer ...", the "X-Api-Key" header, or a "key" field.
export async function keyFromRequest(req: Request, body?: Record<string, unknown> | null) {
  const auth = req.headers.get("authorization");
  const raw =
    (auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "") ||
    req.headers.get("x-api-key") ||
    (body && typeof body === "object" && typeof body.key === "string" ? body.key : "");
  const key = raw.trim();
  if (!/^(pk|sk)_live_[A-Za-z0-9_-]{20,64}$/.test(key)) return null;
  return findKeyByPlain(key);
}

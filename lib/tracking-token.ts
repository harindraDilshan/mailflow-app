import { createHash, createHmac, timingSafeEqual } from "crypto";

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString();

function sign(data: string) {
  return createHmac("sha256", process.env.TRACKING_SECRET!)
    .update(`track:${data}`)
    .digest("base64url")
    .slice(0, 22);
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hashUrl(url: string) {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

// ----- open pixel -----
export function signOpen(messageId: string) {
  return `${messageId}.${sign(messageId)}`;
}

export function verifyOpen(token: string): string | null {
  const [messageId, sig, ...rest] = token.split(".");
  if (!messageId || !sig || rest.length > 0) return null;
  return same(sig, sign(messageId)) ? messageId : null;
}

// ----- click links -----
export function signClick(messageId: string, url: string) {
  const payload = b64(JSON.stringify({ m: messageId, u: url }));
  return `${payload}.${sign(payload)}`;
}

export function verifyClick(token: string): { messageId: string; url: string } | null {
  if (token.length > 4000) return null;
  const [payload, sig, ...rest] = token.split(".");
  if (!payload || !sig || rest.length > 0 || !same(sig, sign(payload))) return null;
  try {
    const { m, u } = JSON.parse(unb64(payload)) as { m?: string; u?: string };
    if (!m || !u || !/^https?:\/\//i.test(u)) return null; // only web links
    return { messageId: m, url: u };
  } catch {
    return null;
  }
}
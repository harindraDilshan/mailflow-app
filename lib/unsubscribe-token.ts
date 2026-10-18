import { createHmac, timingSafeEqual } from "crypto";

function sign(data: string) {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!).update(data).digest("base64url");
}

export function signToken(contactId: string, messageId?: string) {
  const data = messageId ? `${contactId}.${messageId}` : contactId;
  return `${data}.${sign(data)}`;
}

export function parseToken(token: string): { contactId: string; messageId?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2 && parts.length !== 3) return null;

  const sig = parts[parts.length - 1];
  const data = parts.slice(0, -1).join(".");
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { contactId: parts[0], messageId: parts.length === 3 ? parts[1] : undefined };
}

export function verifyToken(token: string): string | null {
  return parseToken(token)?.contactId ?? null;
}
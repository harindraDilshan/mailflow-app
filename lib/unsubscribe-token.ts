import { createHmac, timingSafeEqual } from "crypto";

function sign(contactId: string) {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!).update(contactId).digest("base64url");
}

export function signToken(contactId: string) {
  return `${contactId}.${sign(contactId)}`;
}

export function verifyToken(token: string): string | null {
  const [contactId, sig] = token.split(".");
  if (!contactId || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(contactId));
  return a.length === b.length && timingSafeEqual(a, b) ? contactId : null;
}
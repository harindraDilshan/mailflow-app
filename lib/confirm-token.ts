import { createHmac, timingSafeEqual } from "crypto";

const sign = (data: string) =>
  createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(`confirm:${data}`)
    .digest("base64url")
    .slice(0, 22);

export function signConfirm(contactId: string, hours = 48) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  const data = `${contactId}.${exp}`;
  return `${data}.${sign(data)}`;
}

export function verifyConfirm(token: string): string | null {
  const [id, exp, sig, ...rest] = token.split(".");
  if (!id || !exp || !sig || rest.length > 0) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`${id}.${exp}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(exp) * 1000 > Date.now() ? id : null; // expired links are refused
}
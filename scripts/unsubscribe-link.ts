import { signToken } from "../lib/unsubscribe-token";

const contactId = process.argv[2];
if (!contactId) {
  console.error("Usage: npm run unsub-link -- <contactId>");
  process.exit(1);
}
const base = process.env.NEXT_PUBLIC_APP_URL;
const t = signToken(contactId);
console.log(`Page:             ${base}/unsubscribe?t=${t}`);
console.log(`One-click (POST): ${base}/api/unsubscribe?t=${t}`);
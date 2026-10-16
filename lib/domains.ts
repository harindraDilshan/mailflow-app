import { promises as dns } from "dns";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, DOMAINS_TABLE } from "@/lib/appwrite/db";

export type DomainRow = {
  $id: string;
  accountId: string;
  domain: string;
  status: string;
  dkimStatus: string;
  dkimTokens: string; // JSON text
  mailFromDomain: string | null;
  spfOk: boolean;
  dmarcOk: boolean;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
};

export const MAX_DOMAINS_PER_ACCOUNT = 3;

const DOMAIN_REGEX = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
const FREE_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "icloud.com", "proton.me", "protonmail.com", "aol.com",
]);

export function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^.*@/, "");
}

export function validateDomain(domain: string): string | null {
  if (!DOMAIN_REGEX.test(domain)) return "Enter a valid domain, like mail.shop.com.";
  if (FREE_PROVIDERS.has(domain)) return "Free email domains (like gmail.com) cannot be used. Use your own domain.";
  return null;
}

// ---------- DNS records to show ----------
export type DnsRecord = {
  id: string;
  purpose: string;
  type: "CNAME" | "TXT" | "MX";
  name: string; // full name
  value: string;
  required: boolean;
};

export function buildDnsRecords(domain: string, tokens: string[], region: string): DnsRecord[] {
  const bounce = `bounce.${domain}`;
  return [
    ...tokens.map((t, i) => ({
      id: `dkim-${i}`,
      purpose: "DKIM (signature)",
      type: "CNAME" as const,
      name: `${t}._domainkey.${domain}`,
      value: `${t}.dkim.amazonses.com`,
      required: true,
    })),
    {
      id: "mailfrom-mx",
      purpose: "Bounce address (MX)",
      type: "MX" as const,
      name: bounce,
      value: `10 feedback-smtp.${region}.amazonses.com`,
      required: false,
    },
    {
      id: "spf",
      purpose: "SPF (who may send)",
      type: "TXT" as const,
      name: bounce,
      value: "v=spf1 include:amazonses.com ~all",
      required: false,
    },
    {
      id: "dmarc",
      purpose: "DMARC (the rule)",
      type: "TXT" as const,
      name: `_dmarc.${domain}`,
      value: "v=DMARC1; p=none;",
      required: false,
    },
  ];
}

// ---------- Live DNS check ----------
const clean = (s: string) => s.trim().toLowerCase().replace(/\.$/, "");

export async function checkRecord(r: DnsRecord): Promise<boolean> {
  try {
    if (r.type === "CNAME") {
      const found = await dns.resolveCname(r.name);
      return found.some((v) => clean(v) === clean(r.value));
    }
    if (r.type === "MX") {
      const found = await dns.resolveMx(r.name);
      return found.some((m) => clean(m.exchange) === clean(r.value.split(" ")[1]));
    }
    // TXT
    const found = (await dns.resolveTxt(r.name)).map((chunks) => chunks.join(""));
    if (r.id === "spf") return found.some((t) => t.startsWith("v=spf1") && t.includes("include:amazonses.com"));
    if (r.id === "dmarc") return found.some((t) => t.toUpperCase().startsWith("V=DMARC1"));
    return found.includes(r.value);
  } catch {
    return false; // not found yet
  }
}

// ---------- Database helpers (always filtered by owner) ----------
export async function getOwnedDomain(accountId: string, rowId: string) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: DOMAINS_TABLE,
      rowId,
    })) as unknown as DomainRow;
    return row.accountId === accountId ? row : null; // not yours = not found
  } catch {
    return null;
  }
}

export async function listOwnedDomains(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: DOMAINS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.rows as unknown as DomainRow[];
}
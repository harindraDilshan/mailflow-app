"use server";

import { ID, Permission, Role, Query } from "node-appwrite";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, DOMAINS_TABLE } from "@/lib/appwrite/db";
import {
  normalizeDomain, validateDomain, getOwnedDomain, buildDnsRecords,
  checkRecord, MAX_DOMAINS_PER_ACCOUNT,
} from "@/lib/domains";
import { createDomainIdentity, getDomainIdentity, deleteDomainIdentity } from "@/lib/aws/ses";

type State = { error?: string; message?: string } | undefined;

export async function addDomain(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (!user.emailVerification) return { error: "Please verify your email first." };

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  const problem = validateDomain(domain);
  if (problem) return { error: problem };

  const { tablesDB } = createAdminClient();
  let rowId: string;

  try {
    const mine = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: DOMAINS_TABLE,
      queries: [Query.equal("accountId", user.$id), Query.limit(1)],
    });
    if (mine.total >= MAX_DOMAINS_PER_ACCOUNT) {
      return { error: `You can add up to ${MAX_DOMAINS_PER_ACCOUNT} domains.` };
    }

    const taken = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: DOMAINS_TABLE,
      queries: [Query.equal("domain", domain), Query.limit(1)],
    });
    if (taken.total > 0) return { error: "This domain is already added." };

    const { tokens, mailFromDomain } = await createDomainIdentity(domain);

    const row = await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: DOMAINS_TABLE,
      rowId: ID.unique(),
      data: {
        accountId: user.$id,
        domain,
        status: "pending",
        dkimStatus: "PENDING",
        dkimTokens: JSON.stringify(tokens),
        mailFromDomain,
        spfOk: false,
        dmarcOk: false,
      },
      permissions: [Permission.read(Role.user(user.$id))],
    });
    rowId = row.$id;
  } catch (e) {
    console.error("addDomain failed", e);
    return { error: "Could not add the domain. Try again." };
  }

  redirect(`/domains/${rowId}`);
}

export async function verifyDomain(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const row = await getOwnedDomain(user.$id, id);
  if (!row) return;

  const ses = await getDomainIdentity(row.domain);
  const records = buildDnsRecords(row.domain, ses.tokens, process.env.AWS_REGION!);
  const spf = records.find((r) => r.id === "spf")!;
  const dmarc = records.find((r) => r.id === "dmarc")!;
  const [spfOk, dmarcOk] = await Promise.all([checkRecord(spf), checkRecord(dmarc)]);

  const status = ses.verifiedForSending ? "verified" : ses.dkimStatus === "FAILED" ? "failed" : "pending";
  const now = new Date().toISOString();

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: DOMAINS_TABLE,
    rowId: row.$id,
    data: {
      status,
      dkimStatus: ses.dkimStatus,
      spfOk,
      dmarcOk,
      lastCheckedAt: now,
      ...(status === "verified" && !row.verifiedAt ? { verifiedAt: now } : {}),
    },
  });

  revalidatePath(`/domains/${row.$id}`);
  revalidatePath("/domains");
}

export async function deleteDomain(formData: FormData): Promise<void> {
  const user = await requireUser();
  const row = await getOwnedDomain(user.$id, String(formData.get("id") ?? ""));
  if (!row) return;

  await deleteDomainIdentity(row.domain);
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: DOMAINS_TABLE, rowId: row.$id });

  redirect("/domains");
}
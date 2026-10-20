import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, AUTOMATIONS_TABLE, RUNS_TABLE, MESSAGES_TABLE } from "@/lib/appwrite/db";
import type { EmailStep, Step } from "@/lib/automation-rules";

export type AutomationRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  name: string;
  status: string; // draft | active | paused
  triggerType: "list_joined" | "tag_added";
  triggerValue: string;
  fromName: string | null;
  fromEmail: string;
  steps: string; // JSON
};

export type RunRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  automationId: string;
  contactId: string;
  email: string | null;
  status: string; // active | completed | exited
  stepIndex: number;
  nextRunAt: string | null;
  completedAt: string | null;
  exitReason: string | null;
};

async function count(tableId: string, queries: string[]) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID, tableId, queries: [...queries, Query.limit(1)],
  });
  return res.total;
}

export async function getOwnedAutomation(accountId: string, id: string) {
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({
      databaseId: DB_ID, tableId: AUTOMATIONS_TABLE, rowId: id,
    })) as unknown as AutomationRow;
    return row.accountId === accountId ? row : null;
  } catch {
    return null;
  }
}

export async function listAutomations(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: AUTOMATIONS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.rows as unknown as AutomationRow[];
}

export async function recentRuns(automationId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: RUNS_TABLE,
    queries: [Query.equal("automationId", automationId), Query.orderDesc("$createdAt"), Query.limit(20)],
  });
  return res.rows as unknown as RunRow[];
}

export async function getAutomationStats(a: AutomationRow, steps: Step[]) {
  const runs = (status: string) =>
    count(RUNS_TABLE, [Query.equal("automationId", a.$id), Query.equal("status", status)]);
  const [active, completed, exited] = await Promise.all([runs("active"), runs("completed"), runs("exited")]);

  const msg = (i: number, extra: string[]) =>
    count(MESSAGES_TABLE, [Query.equal("campaignId", a.$id), Query.equal("stepIndex", i), ...extra]);

  const emailSteps = steps
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: EmailStep; i: number } => x.s.type === "email");

  const perStep = await Promise.all(
    emailSteps.map(async ({ s, i }) => ({
      index: i,
      subject: s.subject,
      sent: await msg(i, [Query.equal("status", "sent")]),
      opened: await msg(i, [Query.isNotNull("openedAt")]),
      clicked: await msg(i, [Query.isNotNull("clickedAt")]),
    }))
  );

  return { active, completed, exited, perStep };
}
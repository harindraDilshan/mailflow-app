import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, AUTOMATIONS_TABLE, RUNS_TABLE, MESSAGES_TABLE } from "@/lib/appwrite/db";
import { keyOf, type Flow } from "@/lib/automation-flow";

export type AutomationRow = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  accountId: string;
  name: string;
  status: string; // draft | active | paused
  triggerType: "list_joined" | "tag_added";
  triggerValue: string;
  fromName: string | null;
  fromEmail: string;
  steps: string; // JSON list of steps (old automations)
  flow?: string | null; // JSON workflow graph, see lib/automation-flow.ts
};

export type RunRow = {
  $id: string;
  $createdAt: string;
  accountId: string;
  automationId: string;
  contactId: string;
  email: string | null;
  status: string; // active | completed | exited
  stepIndex: number; // the key of the current step
  nextRunAt: string | null;
  completedAt: string | null;
  exitReason: string | null;
};

export const AUTOMATION_STATUSES = ["draft", "active", "paused"] as const;
export const AUTOMATION_PAGE_SIZE = 20;

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

export async function countAutomations(accountId: string) {
  return count(AUTOMATIONS_TABLE, [Query.equal("accountId", accountId)]);
}

// ---------- automations screen ----------
function automationQueries(accountId: string, f: { q?: string; status?: string }) {
  const queries = [Query.equal("accountId", accountId)];
  if (f.status && (AUTOMATION_STATUSES as readonly string[]).includes(f.status)) queries.push(Query.equal("status", f.status));
  if (f.q?.trim()) queries.push(Query.contains("name", f.q.trim()));
  return queries;
}

export async function searchAutomations(accountId: string, f: { q?: string; status?: string; page: number }) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: AUTOMATIONS_TABLE,
    queries: [
      ...automationQueries(accountId, f),
      Query.orderDesc("$updatedAt"),
      Query.limit(AUTOMATION_PAGE_SIZE),
      Query.offset((f.page - 1) * AUTOMATION_PAGE_SIZE),
    ],
  });
  return { rows: res.rows as unknown as AutomationRow[], total: res.total };
}

export async function countAutomationsByStatus(accountId: string, q?: string) {
  const keys = ["all", ...AUTOMATION_STATUSES] as const;
  const totals = await Promise.all(
    keys.map((s) => count(AUTOMATIONS_TABLE, automationQueries(accountId, { q, status: s === "all" ? undefined : s })))
  );
  return Object.fromEntries(keys.map((k, i) => [k, totals[i]])) as Record<(typeof keys)[number], number>;
}

// People in progress / finished, and emails sent. For the list and the header of one automation.
export async function automationTotals(automationId: string) {
  const runs = (status: string) =>
    count(RUNS_TABLE, [Query.equal("automationId", automationId), Query.equal("status", status)]);
  const [active, completed, exited, sent] = await Promise.all([
    runs("active"),
    runs("completed"),
    runs("exited"),
    count(MESSAGES_TABLE, [Query.equal("campaignId", automationId), Query.equal("status", "sent")]),
  ]);
  return { active, completed, exited, sent };
}

export async function recentRuns(automationId: string, limit = 25) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: RUNS_TABLE,
    queries: [Query.equal("automationId", automationId), Query.orderDesc("$createdAt"), Query.limit(limit)],
  });
  return res.rows as unknown as RunRow[];
}

export type NodeStats = { waiting: number; sent?: number; opened?: number; clicked?: number };

// The numbers shown on each step of the canvas: people waiting there, and for emails sent / opened / clicked.
export async function nodeStats(automationId: string, flow: Flow) {
  const msg = (key: number, extra: string[]) =>
    count(MESSAGES_TABLE, [Query.equal("campaignId", automationId), Query.equal("stepIndex", key), ...extra]);

  const entries = await Promise.all(
    flow.nodes
      .filter((n) => n.type !== "trigger")
      .map(async (n): Promise<[string, NodeStats]> => {
        const key = keyOf(n.id);
        const waiting = count(RUNS_TABLE, [
          Query.equal("automationId", automationId),
          Query.equal("status", "active"),
          Query.equal("stepIndex", key),
        ]);
        if (n.type !== "email") return [n.id, { waiting: await waiting }];
        const [w, sent, opened, clicked] = await Promise.all([
          waiting,
          msg(key, [Query.equal("status", "sent")]),
          msg(key, [Query.isNotNull("openedAt")]),
          msg(key, [Query.isNotNull("clickedAt")]),
        ]);
        return [n.id, { waiting: w, sent, opened, clicked }];
      })
  );
  return Object.fromEntries(entries) as Record<string, NodeStats>;
}

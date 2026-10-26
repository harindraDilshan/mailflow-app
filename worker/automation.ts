import { createHash } from "crypto";
import type { Job } from "bullmq";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE, MESSAGES_TABLE, AUTOMATIONS_TABLE, RUNS_TABLE } from "@/lib/appwrite/db";
import { getQueues } from "@/lib/queue";
import { getProvider } from "@/lib/email";
import { renderEmail, htmlToText, cleanHeader } from "@/lib/email/render";
import { signToken } from "@/lib/unsubscribe-token";
import { signClick, signOpen } from "@/lib/tracking-token";
import { normalizeTags } from "@/lib/contact-rules";
import { countCreatedToday } from "@/lib/campaigns";
import { fireContactTriggers } from "@/lib/automation-trigger";
import {
  TRIGGER_ID, flowOf, keyOf, nextOf, triggerOf, waitMsOf,
  type ActionData, type ConditionData, type FlowNode, type Handle,
} from "@/lib/automation-flow";
import type { AutomationRow, RunRow } from "@/lib/automations";

type ContactLite = {
  $id: string;
  accountId: string;
  email: string;
  name: string | null;
  status: string;
  listIds: string[] | null;
  tags: string[] | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 32);
const code = (e: unknown) => (e as { code?: number })?.code;

const STEP_JOB = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86400 },
};

async function getRow<T>(tableId: string, rowId: string): Promise<T | null> {
  const { tablesDB } = createAdminClient();
  try {
    return (await tablesDB.getRow({ databaseId: DB_ID, tableId, rowId })) as unknown as T;
  } catch (e) {
    if (code(e) === 404) return null;
    throw e; // a temporary problem: let the queue retry
  }
}

async function updateRun(runId: string, data: Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: RUNS_TABLE, rowId: runId, data });
}

const exitRun = (runId: string, reason: string) =>
  updateRun(runId, { status: "exited", exitReason: reason, completedAt: new Date().toISOString() });

const completeRun = (runId: string) =>
  updateRun(runId, { status: "completed", completedAt: new Date().toISOString() });

// stepIndex holds the key of the step (see lib/automation-flow.ts).
function enqueueStep(runId: string, stepIndex: number, delayMs = 0, suffix = "") {
  return getQueues().automation.add(
    "step",
    { runId, stepIndex },
    { ...STEP_JOB, delay: delayMs, jobId: `${runId}-${stepIndex}${suffix}` }
  );
}

// A wait step keeps the run on itself until its time: nextRunAt holds that time.
const delayBefore = (node: FlowNode) => (node.type === "wait" ? waitMsOf(node.data) : 0);

// Moves the run to `next` and queues it. No next step (or an exit step) finishes the run.
async function goTo(runId: string, next: FlowNode | null) {
  if (!next || next.type === "exit") return completeRun(runId);
  const key = keyOf(next.id);
  const delay = delayBefore(next);
  await updateRun(runId, { stepIndex: key, nextRunAt: new Date(Date.now() + delay).toISOString() });
  await enqueueStep(runId, key, delay, delay > 0 ? "-w" : "");
}

// Does the contact still belong to the list or tag that started this automation?
function stillQualifies(trigger: ReturnType<typeof triggerOf>, c: ContactLite) {
  const { triggerType, triggerValue } = trigger.data;
  if (triggerType === "list_joined") return (c.listIds ?? []).includes(triggerValue);
  return (c.tags ?? []).includes(triggerValue);
}

async function saveMessage(messageId: string, data: Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  for (let i = 1; i <= 3; i++) {
    try {
      await tablesDB.updateRow({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: messageId, data });
      return;
    } catch (e) {
      if (i === 3) console.error(`Could not save message ${messageId}`, e);
      else await sleep(500 * i);
    }
  }
}

// ---------- conditions and actions ----------
async function conditionMet(run: RunRow, contact: ContactLite, data: ConditionData) {
  if (data.kind === "has_tag") return (contact.tags ?? []).includes(data.value);
  if (data.kind === "in_list") return (contact.listIds ?? []).includes(data.value);
  // Opened / clicked: the message of that email step in this run (same ID scheme as when it was sent).
  const key = keyOf(data.value);
  if (key < 0) return false;
  const msg = await getRow<{ openedAt: string | null; clickedAt: string | null }>(MESSAGES_TABLE, sha(`${run.$id}:${key}`));
  return data.kind === "opened" ? Boolean(msg?.openedAt) : Boolean(msg?.clickedAt);
}

async function applyAction(run: RunRow, contact: ContactLite, data: ActionData) {
  const tags = contact.tags ?? [];
  const lists = contact.listIds ?? [];
  let update: { tags?: string[]; listIds?: string[] } | null = null;

  if (data.kind === "add_tag" && !tags.includes(data.value)) update = { tags: normalizeTags([...tags, data.value]) };
  if (data.kind === "remove_tag" && tags.includes(data.value)) update = { tags: tags.filter((t) => t !== data.value) };
  if (data.kind === "remove_list" && lists.includes(data.value)) {
    update = { listIds: lists.filter((l) => l !== data.value) };
  }
  if (data.kind === "add_list" && !lists.includes(data.value)) {
    const list = await getRow<{ accountId: string }>(LISTS_TABLE, data.value);
    if (list?.accountId === run.accountId) update = { listIds: [...lists, data.value] }; // a deleted list is skipped
  }
  if (!update) return;

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contact.$id, data: update });
  // A new tag or list can start other automations, the same as when a person is edited by hand.
  // A contact enters each automation only once, so two automations cannot start each other forever.
  if (data.kind === "add_tag" && update.tags?.includes(data.value)) {
    await fireContactTriggers(run.accountId, contact.$id, [], [data.value]);
  }
  if (data.kind === "add_list") await fireContactTriggers(run.accountId, contact.$id, [data.value], []);
}

// The same person always takes the same path of a split, also after a retry.
function splitHandle(runId: string, nodeId: string, percentA: number): Handle {
  return parseInt(sha(`${runId}:${nodeId}`).slice(0, 8), 16) % 100 < percentA ? "a" : "b";
}

// ---------- 1. A trigger: start runs ----------
export async function automationTrigger(
  job: Job<{ accountId: string; contactId: string; type: string; value: string }>
) {
  const { accountId, contactId, type, value } = job.data;

  const contact = await getRow<ContactLite>(CONTACTS_TABLE, contactId);
  if (!contact || contact.accountId !== accountId || contact.status !== "active") return;

  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: AUTOMATIONS_TABLE,
    queries: [
      Query.equal("accountId", accountId),
      Query.equal("status", "active"),
      Query.equal("triggerType", type),
      Query.equal("triggerValue", value),
      Query.limit(20),
    ],
  });

  for (const a of res.rows as unknown as AutomationRow[]) {
    const first = nextOf(flowOf(a), TRIGGER_ID);
    if (!first || first.type === "exit") continue;

    const runId = sha(`${a.$id}:${contactId}`); // same automation + same contact = same run
    const key = keyOf(first.id);
    const delay = delayBefore(first);
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: RUNS_TABLE,
        rowId: runId,
        data: {
          accountId,
          automationId: a.$id,
          contactId,
          email: contact.email,
          status: "active",
          stepIndex: key,
          nextRunAt: new Date(Date.now() + delay).toISOString(),
        },
      });
    } catch (e) {
      if (code(e) === 409) continue; // already entered once
      throw e;
    }
    await enqueueStep(runId, key, delay, delay > 0 ? "-w" : "");
  }
}

// ---------- 2. One step of one run ----------
export async function automationStep(job: Job<{ runId: string; stepIndex: number }>) {
  const { runId, stepIndex } = job.data;

  const run = await getRow<RunRow>(RUNS_TABLE, runId);
  // Not active, or already moved on: this is an old or duplicate job.
  if (!run || run.status !== "active" || run.stepIndex !== stepIndex) return;

  const automation = await getRow<AutomationRow>(AUTOMATIONS_TABLE, run.automationId);
  if (!automation) return exitRun(runId, "automation_deleted");
  if (automation.status !== "active") return; // paused: the sweeper continues it after resume

  const contact = await getRow<ContactLite>(CONTACTS_TABLE, run.contactId);
  if (!contact) return exitRun(runId, "contact_deleted");
  if (contact.status !== "active") return exitRun(runId, `contact_${contact.status}`);

  const flow = flowOf(automation);
  const trigger = triggerOf(flow);
  if (trigger.data.exitOnLeave && !stillQualifies(trigger, contact)) return exitRun(runId, "left_trigger");

  const node = flow.nodes.find((n) => n.type !== "trigger" && keyOf(n.id) === stepIndex);
  if (!node) return completeRun(runId); // the step was deleted while the automation was paused

  switch (node.type) {
    case "wait": {
      // Woken up early (for example, the run was re-queued): sleep for the rest of the time.
      const left = Date.parse(run.nextRunAt ?? "") - Date.now();
      if (left > 1000) {
        await enqueueStep(runId, stepIndex, left, `-w${Math.floor(Date.now() / 60_000)}`);
        return;
      }
      return goTo(runId, nextOf(flow, node.id));
    }
    case "condition": {
      const met = await conditionMet(run, contact, node.data);
      return goTo(runId, nextOf(flow, node.id, met ? "yes" : "no"));
    }
    case "split":
      return goTo(runId, nextOf(flow, node.id, splitHandle(runId, node.id, node.data.percentA)));
    case "action":
      await applyAction(run, contact, node.data);
      return goTo(runId, nextOf(flow, node.id));
    case "exit":
      return completeRun(runId);
    case "email":
      break; // below
    default:
      return completeRun(runId);
  }

  // ----- email -----
  const limit = Number(process.env.DAILY_SEND_LIMIT ?? 5000);
  if ((await countCreatedToday(run.accountId)) >= limit) {
    const delay = 3_600_000; // over the daily limit: try again in an hour, do not drop it
    await updateRun(runId, { nextRunAt: new Date(Date.now() + delay).toISOString() });
    await enqueueStep(runId, stepIndex, delay, `-d${Math.floor(Date.now() / delay)}`);
    return;
  }

  const { tablesDB } = createAdminClient();
  const messageId = sha(`${runId}:${stepIndex}`); // one message per run and step
  try {
    await tablesDB.createRow({
      databaseId: DB_ID,
      tableId: MESSAGES_TABLE,
      rowId: messageId,
      data: {
        accountId: run.accountId,
        campaignId: automation.$id, // for automation emails this holds the automation ID
        contactId: contact.$id,
        email: contact.email,
        name: contact.name ?? "",
        status: "queued",
        stepIndex,
        attempts: 0,
      },
    });
  } catch (e) {
    if (code(e) !== 409) throw e;
    const prev = await getRow<{ status: string; $createdAt: string }>(MESSAGES_TABLE, messageId);
    if (prev && prev.status !== "queued") return goTo(runId, nextOf(flow, node.id)); // already done
    if (prev && Date.now() - Date.parse(prev.$createdAt) < 5 * 60_000) return; // another worker is on it
  }

  const base = process.env.NEXT_PUBLIC_APP_URL;
  const token = signToken(contact.$id, messageId);
  const tracking =
    process.env.TRACKING_ENABLED === "false"
      ? undefined
      : {
          trackLink: (url: string) => `${base}/t/c/${signClick(messageId, url)}`,
          pixelUrl: `${base}/t/o/${signOpen(messageId)}`,
        };

  const html = renderEmail(
    node.data.html,
    { name: contact.name, email: contact.email },
    `${base}/unsubscribe?t=${token}`,
    tracking,
    { previewText: node.data.previewText }
  );
  const fromName = cleanHeader(automation.fromName ?? "");

  const res = await getProvider().send({
    to: contact.email,
    from: fromName ? `${fromName} <${automation.fromEmail}>` : automation.fromEmail,
    subject: cleanHeader(node.data.subject),
    html,
    text: htmlToText(html),
    headers: {
      "List-Unsubscribe": `<${base}/api/unsubscribe?t=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: { mid: messageId },
  });

  if (res.ok) {
    await saveMessage(messageId, {
      status: "sent",
      providerMessageId: res.messageId.slice(0, 200),
      sentAt: new Date().toISOString(),
      attempts: job.attemptsMade + 1,
    });
    return goTo(runId, nextOf(flow, node.id));
  }
  if (!res.retryable) {
    await saveMessage(messageId, { status: "failed", error: res.error, attempts: job.attemptsMade + 1 });
    return exitRun(runId, "email_rejected");
  }
  throw new Error(res.error); // the queue waits and tries again
}

// ---------- 3. Safety net: re-queue runs that were forgotten ----------
export async function sweepRuns() {
  const { tablesDB } = createAdminClient();
  const graceMs = Number(process.env.SWEEP_GRACE_MINUTES ?? 10) * 60_000;
  const cutoff = new Date(Date.now() - graceMs).toISOString();
  const bucket = Math.floor(Date.now() / graceMs);

  const autos = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: AUTOMATIONS_TABLE,
    queries: [Query.equal("status", "active"), Query.limit(100)],
  });

  for (const a of autos.rows as unknown as AutomationRow[]) {
    const runs = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: RUNS_TABLE,
      queries: [
        Query.equal("automationId", a.$id),
        Query.equal("status", "active"),
        Query.lessThanEqual("nextRunAt", cutoff),
        Query.limit(50),
      ],
    });
    for (const r of runs.rows as unknown as RunRow[]) {
      await enqueueStep(r.$id, r.stepIndex, 0, `-s${bucket}`);
    }
  }
}

// The workflow of an automation: a graph of steps (nodes) and connections (edges).
// Pure code: the builder in the browser, the server actions, and the worker all use it.
//
// Every node except the trigger has a number ("key", the digits in its id "n12"). A run stores the
// key of its current step in `stepIndex`, and the emails of a step store it in messages.stepIndex.
// Keys are never reused (see `nextKey`), so stats and waiting people always stay with their step.
// Old automations were a list of steps; step i becomes node "n{i}", so their runs keep working.

import { normalizeTags } from "@/lib/contact-rules";
import type { Step } from "@/lib/automation-rules";

export type TriggerType = "list_joined" | "tag_added";
export type WaitUnit = "minutes" | "hours" | "days";
export type ConditionKind = "has_tag" | "in_list" | "opened" | "clicked";
export type ActionKind = "add_tag" | "remove_tag" | "add_list" | "remove_list";
export type Handle = "out" | "yes" | "no" | "a" | "b";

export type TriggerData = { triggerType: TriggerType; triggerValue: string; exitOnLeave: boolean };
export type EmailData = { subject: string; previewText: string; html: string };
export type WaitData = { amount: number; unit: WaitUnit };
export type ConditionData = { kind: ConditionKind; value: string };
export type ActionData = { kind: ActionKind; value: string };
export type SplitData = { percentA: number };

type Base = { id: string; x: number; y: number };
export type FlowNode =
  | (Base & { type: "trigger"; data: TriggerData })
  | (Base & { type: "email"; data: EmailData })
  | (Base & { type: "wait"; data: WaitData })
  | (Base & { type: "condition"; data: ConditionData })
  | (Base & { type: "action"; data: ActionData })
  | (Base & { type: "split"; data: SplitData })
  | (Base & { type: "exit"; data: Record<string, never> });
export type FlowNodeType = FlowNode["type"];
export type FlowEdge = { source: string; handle: Handle; target: string };
export type Flow = { version: 2; nextKey: number; nodes: FlowNode[]; edges: FlowEdge[] };

export const TRIGGER_ID = "trigger";
export const MAX_NODES = 60;
export const MAX_EMAIL_HTML = 60_000;
export const MAX_FLOW_CHARS = 1_000_000;
export const MAX_WAIT_DAYS = 60;

const UNIT_MS: Record<WaitUnit, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
export const waitMsOf = (d: WaitData) => d.amount * UNIT_MS[d.unit];

// The outputs each kind of step has. A step with no connection on an output ends the run there.
export const HANDLES: Record<FlowNodeType, Handle[]> = {
  trigger: ["out"],
  email: ["out"],
  wait: ["out"],
  action: ["out"],
  condition: ["yes", "no"],
  split: ["a", "b"],
  exit: [],
};

export const nodeId = (key: number) => `n${key}`;
export const keyOf = (id: string) => (/^n\d+$/.test(id) ? Number(id.slice(1)) : -1);

// ---------- defaults for new steps ----------
export function defaultData(type: Exclude<FlowNodeType, "trigger">, kind?: string): FlowNode["data"] {
  switch (type) {
    case "email":
      return { subject: "", previewText: "", html: "<p>Hi {{name}},</p>\n<p></p>" };
    case "wait":
      return { amount: 1, unit: "days" };
    case "condition":
      return { kind: (kind as ConditionKind) ?? "opened", value: "" };
    case "action":
      return { kind: (kind as ActionKind) ?? "add_tag", value: "" };
    case "split":
      return { percentA: 50 };
    case "exit":
      return {};
  }
}

// ---------- old automations (a plain list of steps) ----------
export function fromLegacySteps(steps: Step[], trigger: TriggerData): Flow {
  const nodes: FlowNode[] = [{ id: TRIGGER_ID, type: "trigger", x: 0, y: 0, data: trigger }];
  const edges: FlowEdge[] = [];
  steps.forEach((s, i) => {
    const id = nodeId(i);
    const y = (i + 1) * 150;
    if (s.type === "email") nodes.push({ id, type: "email", x: 0, y, data: { subject: s.subject, previewText: "", html: s.html } });
    else nodes.push({ id, type: "wait", x: 0, y, data: { amount: s.amount, unit: s.unit } });
    edges.push({ source: i === 0 ? TRIGGER_ID : nodeId(i - 1), handle: "out", target: id });
  });
  return { version: 2, nextKey: steps.length, nodes, edges };
}

// ---------- reading a flow safely (from the browser or the database) ----------
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const oneLine = (v: unknown, max: number) => str(v, max * 2).replace(/[\r\n]+/g, " ").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);

function cleanData(type: FlowNodeType, raw: Record<string, unknown>): FlowNode["data"] | string {
  switch (type) {
    case "trigger": {
      const triggerType = raw.triggerType === "tag_added" ? "tag_added" : "list_joined";
      const value = oneLine(raw.triggerValue, 100);
      return {
        triggerType,
        triggerValue: triggerType === "tag_added" ? (normalizeTags(value)[0] ?? "") : value,
        exitOnLeave: raw.exitOnLeave !== false,
      };
    }
    case "email":
      return {
        subject: oneLine(raw.subject, 200),
        previewText: oneLine(raw.previewText, 200),
        html: str(raw.html, MAX_EMAIL_HTML),
      };
    case "wait": {
      const unit = raw.unit === "minutes" || raw.unit === "hours" ? raw.unit : "days";
      const amount = num(raw.amount);
      if (amount < 1) return "A wait must be at least 1 minute, hour, or day.";
      if (amount * UNIT_MS[unit] > MAX_WAIT_DAYS * UNIT_MS.days) return `A wait can be at most ${MAX_WAIT_DAYS} days.`;
      return { amount, unit };
    }
    case "condition": {
      const kinds: ConditionKind[] = ["has_tag", "in_list", "opened", "clicked"];
      const kind = kinds.includes(raw.kind as ConditionKind) ? (raw.kind as ConditionKind) : "has_tag";
      const value = oneLine(raw.value, 100);
      return { kind, value: kind === "has_tag" ? (normalizeTags(value)[0] ?? "") : value };
    }
    case "action": {
      const kinds: ActionKind[] = ["add_tag", "remove_tag", "add_list", "remove_list"];
      const kind = kinds.includes(raw.kind as ActionKind) ? (raw.kind as ActionKind) : "add_tag";
      const value = oneLine(raw.value, 100);
      return { kind, value: kind.endsWith("_tag") ? (normalizeTags(value)[0] ?? "") : value };
    }
    case "split":
      return { percentA: Math.min(99, Math.max(1, num(raw.percentA) || 50)) };
    case "exit":
      return {};
  }
}

// True when a connection from `source` to `target` would make a loop.
export function makesLoop(edges: FlowEdge[], source: string, target: string) {
  const seen = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === source) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.source === id) stack.push(e.target);
  }
  return false;
}

/** Checks and cleans a flow. Returns the clean flow, or the reason it is not valid. */
export function parseFlow(input: unknown): { flow: Flow; error?: undefined } | { flow?: undefined; error: string } {
  if (!input || typeof input !== "object") return { error: "The workflow could not be read." };
  const raw = input as { nodes?: unknown; edges?: unknown; nextKey?: unknown };
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return { error: "The workflow could not be read." };
  if (raw.nodes.length > MAX_NODES) return { error: `A workflow can have at most ${MAX_NODES} steps.` };

  const nodes: FlowNode[] = [];
  const types = new Map<string, FlowNodeType>();
  for (const item of raw.nodes) {
    const n = (item ?? {}) as Record<string, unknown>;
    const id = String(n.id ?? "");
    const type = n.type as FlowNodeType;
    if (!(type in HANDLES)) return { error: "The workflow has a step of an unknown kind." };
    if (type === "trigger" ? id !== TRIGGER_ID : keyOf(id) < 0) return { error: "The workflow has a step with a wrong ID." };
    if (types.has(id)) return { error: "Two steps have the same ID." };
    const data = cleanData(type, (n.data ?? {}) as Record<string, unknown>);
    if (typeof data === "string") return { error: data };
    const clamp = (v: unknown) => Math.max(-100_000, Math.min(100_000, num(v)));
    nodes.push({ id, type, x: clamp(n.x), y: clamp(n.y), data } as FlowNode);
    types.set(id, type);
  }
  if (nodes.filter((n) => n.type === "trigger").length !== 1) return { error: "A workflow needs exactly one trigger." };

  const edges: FlowEdge[] = [];
  const used = new Set<string>();
  for (const item of raw.edges) {
    const e = (item ?? {}) as Record<string, unknown>;
    const source = String(e.source ?? "");
    const target = String(e.target ?? "");
    const handle = String(e.handle ?? "out") as Handle;
    const sourceType = types.get(source);
    if (!sourceType || !types.has(target)) return { error: "A connection points to a step that does not exist." };
    if (target === TRIGGER_ID || source === target) return { error: "A connection is not valid." };
    if (!HANDLES[sourceType].includes(handle)) return { error: "A connection starts from a wrong output." };
    if (used.has(`${source}:${handle}`)) return { error: "An output can connect to one step only." };
    if (makesLoop(edges, source, target)) {
      return { error: "The workflow has a loop. Remove the connection that goes back to an earlier step." };
    }
    used.add(`${source}:${handle}`);
    edges.push({ source, handle, target });
  }

  const maxKey = Math.max(-1, ...nodes.map((n) => keyOf(n.id)));
  const nextKey = Math.max(maxKey + 1, num(raw.nextKey));
  const flow: Flow = { version: 2, nextKey, nodes, edges };
  if (JSON.stringify(flow).length > MAX_FLOW_CHARS) return { error: "The workflow is too large. Make the emails shorter." };
  return { flow };
}

// The flow of an automation row: the saved workflow, or the old list of steps.
export function flowOf(a: {
  flow?: string | null;
  steps?: string | null;
  triggerType: string;
  triggerValue: string;
}): Flow {
  const trigger: TriggerData = {
    triggerType: a.triggerType === "tag_added" ? "tag_added" : "list_joined",
    triggerValue: a.triggerValue,
    exitOnLeave: true,
  };
  try {
    if (a.flow) {
      const parsed = parseFlow(JSON.parse(a.flow));
      if (parsed.flow) return parsed.flow;
    }
    const steps = JSON.parse(a.steps || "[]");
    if (Array.isArray(steps)) return fromLegacySteps(steps as Step[], trigger);
  } catch {}
  return fromLegacySteps([], trigger);
}

// ---------- walking the flow ----------
export const findNode = (flow: Flow, id: string) => flow.nodes.find((n) => n.id === id);
export const triggerOf = (flow: Flow) => flow.nodes.find((n) => n.type === "trigger") as Extract<FlowNode, { type: "trigger" }>;

// The step that follows `id` on output `handle`, or null (the run ends).
export function nextOf(flow: Flow, id: string, handle: Handle = "out") {
  const edge = flow.edges.find((e) => e.source === id && e.handle === handle);
  return edge ? (findNode(flow, edge.target) ?? null) : null;
}

export function reachableIds(flow: Flow) {
  const seen = new Set<string>([TRIGGER_ID]);
  const stack = [TRIGGER_ID];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const e of flow.edges) {
      if (e.source === id && !seen.has(e.target)) {
        seen.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return seen;
}

// ---------- problems that block "Turn on" ----------
export type FlowIssue = { nodeId?: string; message: string };

/** Problems the browser can see by itself. The server adds the sender and list checks. */
export function flowIssues(flow: Flow, lists: { id: string }[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const listIds = new Set(lists.map((l) => l.id));
  const reachable = reachableIds(flow);
  const trigger = triggerOf(flow);

  if (trigger.data.triggerType === "list_joined" && !listIds.has(trigger.data.triggerValue)) {
    issues.push({ nodeId: TRIGGER_ID, message: "Choose the list that starts this automation." });
  }
  if (trigger.data.triggerType === "tag_added" && !trigger.data.triggerValue) {
    issues.push({ nodeId: TRIGGER_ID, message: "Enter the tag that starts this automation." });
  }
  if (!nextOf(flow, TRIGGER_ID)) issues.push({ nodeId: TRIGGER_ID, message: "Connect the trigger to the first step." });

  const loose = flow.nodes.filter((n) => !reachable.has(n.id));
  for (const n of loose) issues.push({ nodeId: n.id, message: "This step is not connected. Connect it or delete it." });

  const emails = flow.nodes.filter((n): n is Extract<FlowNode, { type: "email" }> => n.type === "email");
  if (!emails.some((n) => reachable.has(n.id))) issues.push({ message: "Add at least one email step." });

  for (const n of flow.nodes) {
    if (n.type === "email") {
      if (!n.data.subject) issues.push({ nodeId: n.id, message: "Add a subject line." });
      if (!n.data.html.trim()) issues.push({ nodeId: n.id, message: "The email is empty." });
      else if (/href\s*=\s*["']\s*(javascript|data):/i.test(n.data.html)) {
        issues.push({ nodeId: n.id, message: "Links starting with javascript: or data: are not allowed." });
      } else if (/href\s*=\s*["']https?:\/\/(www\.)?example\.com/i.test(n.data.html)) {
        issues.push({ nodeId: n.id, message: "Replace the example.com links with your own links." });
      }
    }
    if (n.type === "wait") {
      if (!(n.data.amount >= 1)) issues.push({ nodeId: n.id, message: "A wait must be at least 1." });
      else if (waitMsOf(n.data) > MAX_WAIT_DAYS * UNIT_MS.days) {
        issues.push({ nodeId: n.id, message: `A wait can be at most ${MAX_WAIT_DAYS} days.` });
      }
      if (!nextOf(flow, n.id)) {
        issues.push({ nodeId: n.id, message: "A wait at the end does nothing. Add a step after it, or delete it." });
      }
    }
    if (n.type === "condition") {
      if (!n.data.value) issues.push({ nodeId: n.id, message: "Complete the condition." });
      else if (n.data.kind === "in_list" && !listIds.has(n.data.value)) {
        issues.push({ nodeId: n.id, message: "The list of this condition no longer exists." });
      } else if ((n.data.kind === "opened" || n.data.kind === "clicked") && findNode(flow, n.data.value)?.type !== "email") {
        issues.push({ nodeId: n.id, message: "Choose the email that this condition checks." });
      }
    }
    if (n.type === "action") {
      if (!n.data.value) issues.push({ nodeId: n.id, message: "Complete the action." });
      else if (n.data.kind.endsWith("_list") && !listIds.has(n.data.value)) {
        issues.push({ nodeId: n.id, message: "The list of this action no longer exists." });
      }
    }
  }
  return issues;
}

// ---------- auto-arrange ----------
const COLUMN = 300;
const ROW = 170;
const BRANCH_OFFSET: Partial<Record<Handle, number>> = { yes: -1, a: -1, no: 1, b: 1 };

/** Places the steps in rows under the trigger. Branches go left (yes / A) and right (no / B). */
export function autoLayout(flow: Flow): Flow {
  // Row = the longest path from the trigger, so a step always sits below all the steps before it.
  const depth = new Map<string, number>([[TRIGGER_ID, 0]]);
  let changed = true;
  for (let pass = 0; changed && pass < flow.nodes.length + 1; pass++) {
    changed = false;
    for (const e of flow.edges) {
      const d = depth.get(e.source);
      if (d !== undefined && (depth.get(e.target) ?? -1) < d + 1) {
        depth.set(e.target, d + 1);
        changed = true;
      }
    }
  }

  const x = new Map<string, number>([[TRIGGER_ID, 0]]);
  const maxDepth = Math.max(0, ...depth.values());
  for (let row = 1; row <= maxDepth; row++) {
    const ids = flow.nodes.filter((n) => depth.get(n.id) === row).map((n) => n.id);
    const wanted = ids.map((id) => {
      const parents = flow.edges.filter((e) => e.target === id && x.has(e.source));
      const sum = parents.reduce((s, e) => s + x.get(e.source)! + (BRANCH_OFFSET[e.handle] ?? 0) * (COLUMN / 2), 0);
      return { id, x: parents.length ? sum / parents.length : 0 };
    });
    wanted.sort((a, b) => a.x - b.x);
    // Keep the wanted places, but never closer than one column. Then move the row back to its center.
    const center = wanted.reduce((s, w) => s + w.x, 0) / Math.max(1, wanted.length);
    for (let i = 1; i < wanted.length; i++) wanted[i].x = Math.max(wanted[i].x, wanted[i - 1].x + COLUMN);
    const shift = wanted.reduce((s, w) => s + w.x, 0) / Math.max(1, wanted.length) - center;
    for (const w of wanted) x.set(w.id, w.x - shift);
  }

  // Steps that are not connected go in a column on the right.
  const right = Math.max(0, ...x.values()) + COLUMN * 1.5;
  let loose = 0;
  return {
    ...flow,
    nodes: flow.nodes.map((n) =>
      depth.has(n.id)
        ? { ...n, x: Math.round(x.get(n.id) ?? 0), y: depth.get(n.id)! * ROW }
        : { ...n, x: Math.round(right), y: loose++ * ROW }
    ),
  };
}

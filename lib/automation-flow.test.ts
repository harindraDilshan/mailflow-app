import { describe, it, expect } from "vitest";
import {
  autoLayout, flowIssues, flowOf, fromLegacySteps, makesLoop, nextOf, parseFlow, type Flow,
} from "./automation-flow";

const trigger = { triggerType: "list_joined" as const, triggerValue: "list1", exitOnLeave: true };

const branching = (): Flow => ({
  version: 2,
  nextKey: 4,
  nodes: [
    { id: "trigger", type: "trigger", x: 0, y: 0, data: trigger },
    { id: "n0", type: "email", x: 0, y: 0, data: { subject: "Hi", previewText: "", html: "<p>Hi</p>" } },
    { id: "n1", type: "condition", x: 0, y: 0, data: { kind: "opened", value: "n0" } },
    { id: "n2", type: "email", x: 0, y: 0, data: { subject: "Yes", previewText: "", html: "<p>Y</p>" } },
    { id: "n3", type: "email", x: 0, y: 0, data: { subject: "No", previewText: "", html: "<p>N</p>" } },
  ],
  edges: [
    { source: "trigger", handle: "out", target: "n0" },
    { source: "n0", handle: "out", target: "n1" },
    { source: "n1", handle: "yes", target: "n2" },
    { source: "n1", handle: "no", target: "n3" },
  ],
});

describe("old automations", () => {
  it("turns step i into node n{i}, so running people keep their place", () => {
    const flow = fromLegacySteps(
      [
        { type: "email", subject: "A", html: "<p>A</p>" },
        { type: "wait", amount: 2, unit: "days" },
      ],
      trigger
    );
    expect(flow.nodes.map((n) => n.id)).toEqual(["trigger", "n0", "n1"]);
    expect(nextOf(flow, "trigger")?.id).toBe("n0");
    expect(nextOf(flow, "n0")?.id).toBe("n1");
    expect(flow.nextKey).toBe(2);
  });

  it("reads the old steps column when there is no flow", () => {
    const flow = flowOf({ steps: '[{"type":"email","subject":"A","html":"x"}]', triggerType: "tag_added", triggerValue: "vip" });
    expect(flow.nodes).toHaveLength(2);
    expect(flow.nodes[0].data).toMatchObject({ triggerType: "tag_added", triggerValue: "vip" });
  });
});

describe("parseFlow", () => {
  it("accepts a valid branching flow and follows the branches", () => {
    const { flow } = parseFlow(branching());
    expect(flow).toBeDefined();
    expect(nextOf(flow!, "n1", "yes")?.id).toBe("n2");
    expect(nextOf(flow!, "n1", "no")?.id).toBe("n3");
    expect(nextOf(flow!, "n2")).toBeNull();
  });

  it("refuses a loop", () => {
    const f = branching();
    f.edges.push({ source: "n2", handle: "out", target: "n0" });
    expect(parseFlow(f).error).toMatch(/loop/);
    expect(makesLoop(branching().edges, "n3", "n0")).toBe(true);
  });

  it("refuses two connections from one output, and wrong outputs", () => {
    const twice = branching();
    twice.edges.push({ source: "n0", handle: "out", target: "n2" });
    expect(parseFlow(twice).error).toMatch(/one step only/);

    const wrong = branching();
    wrong.edges[1] = { source: "n0", handle: "yes", target: "n1" };
    expect(parseFlow(wrong).error).toMatch(/wrong output/);
  });

  it("needs exactly one trigger and cleans the data", () => {
    const f = branching();
    f.nodes = f.nodes.filter((n) => n.type !== "trigger");
    f.edges = f.edges.filter((e) => e.source !== "trigger");
    expect(parseFlow(f).error).toMatch(/trigger/);

    const g = branching() as unknown as { nodes: { data: Record<string, unknown> }[] };
    g.nodes[0].data = { triggerType: "tag_added", triggerValue: "  VIP , other" };
    expect(parseFlow(g).flow?.nodes[0].data).toMatchObject({ triggerValue: "vip", exitOnLeave: true });
  });

  it("never reuses a key", () => {
    const f = branching();
    f.nextKey = 1; // lower than the keys in use
    expect(parseFlow(f).flow?.nextKey).toBe(4);
  });
});

describe("flowIssues", () => {
  it("finds a ready flow ready", () => {
    expect(flowIssues(branching(), [{ id: "list1" }])).toEqual([]);
  });

  it("names the step of each problem", () => {
    const f = branching();
    f.nodes.push({ id: "n4", type: "wait", x: 0, y: 0, data: { amount: 1, unit: "days" } });
    f.edges.push({ source: "n3", handle: "out", target: "n4" });
    f.nodes.push({ id: "n5", type: "exit", x: 0, y: 0, data: {} });
    (f.nodes[2].data as { value: string }).value = "n4"; // a condition that points to a wait, not an email
    const ids = flowIssues(f, []).map((i) => i.nodeId);
    expect(ids).toEqual(expect.arrayContaining(["trigger", "n1", "n4", "n5"]));
  });
});

describe("autoLayout", () => {
  it("puts each step below the one before, and yes left of no", () => {
    const flow = autoLayout(branching());
    const at = (id: string) => flow.nodes.find((n) => n.id === id)!;
    expect(at("n0").y).toBeGreaterThan(at("trigger").y);
    expect(at("n1").y).toBeGreaterThan(at("n0").y);
    expect(at("n2").x).toBeLessThan(at("n3").x);
    expect(at("n2").y).toBe(at("n3").y);
  });
});

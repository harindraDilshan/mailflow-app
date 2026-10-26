import { autoLayout, TRIGGER_ID, type Flow, type FlowEdge, type FlowNode, type TriggerData } from "./automation-flow";

// Starting points for a new automation ("recipes"). The user changes the emails in the builder.

export type Recipe = { id: string; name: string; description: string; steps: string };

// A step without a place on the canvas. autoLayout places it.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Draft = DistributiveOmit<FlowNode, "x" | "y">;

const email = (id: string, subject: string, body: string): Draft => ({
  id,
  type: "email",
  data: { subject, previewText: "", html: `<p>Hi {{name}},</p>\n${body}\n<p>Thanks,<br>The team</p>` },
});
const wait = (id: string, amount: number): Draft => ({ id, type: "wait", data: { amount, unit: "days" } });
const edge = (source: string, target: string, handle: FlowEdge["handle"] = "out"): FlowEdge => ({ source, handle, target });

const RECIPES: (Recipe & { build: () => { nodes: Draft[]; edges: FlowEdge[] } })[] = [
  {
    id: "welcome",
    name: "Welcome series",
    description: "Three emails over five days for new subscribers.",
    steps: "3 emails · 2 waits",
    build: () => ({
      nodes: [
        email("n0", "Welcome! Here is what to expect", "<p>Thanks for joining us. In the next days we send you a few short emails with our best tips.</p>"),
        wait("n1", 2),
        email("n2", "Three tips to get started", "<ol><li>Tip one</li><li>Tip two</li><li>Tip three</li></ol>"),
        wait("n3", 3),
        email("n4", "Something special for you", "<p>Here is a special offer, just for new subscribers.</p>"),
      ],
      edges: [edge(TRIGGER_ID, "n0"), edge("n0", "n1"), edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n4")],
    }),
  },
  {
    id: "welcome_followup",
    name: "Welcome with a follow-up",
    description: "People who did not open the welcome email get a second try with a new subject.",
    steps: "3 emails · if / else",
    build: () => ({
      nodes: [
        email("n0", "Welcome to the community", "<p>We are happy that you are here. Here is how to get the most from your subscription.</p>"),
        wait("n1", 2),
        { id: "n2", type: "condition", data: { kind: "opened", value: "n0" } },
        email("n3", "Your next step", "<p>You read our welcome email. Here is the next thing to try.</p>"),
        email("n4", "Did you miss this?", "<p>A short reminder of what you get as a subscriber.</p>"),
      ],
      edges: [edge(TRIGGER_ID, "n0"), edge("n0", "n1"), edge("n1", "n2"), edge("n2", "n3", "yes"), edge("n2", "n4", "no")],
    }),
  },
  {
    id: "nurture",
    name: "Lead nurture",
    description: "Tag people who click as hot leads and send them an offer. Remind the others.",
    steps: "3 emails · if / else · tag",
    build: () => ({
      nodes: [
        email("n0", "A quick introduction", "<p>Here is what we do, and how it helps people like you.</p>"),
        wait("n1", 3),
        { id: "n2", type: "condition", data: { kind: "clicked", value: "n0" } },
        { id: "n3", type: "action", data: { kind: "add_tag", value: "hot-lead" } },
        email("n4", "An offer for you", "<p>You showed interest, so here is an offer just for you.</p>"),
        wait("n5", 4),
        email("n6", "Still curious?", "<p>A short reminder, in case you missed our last email.</p>"),
      ],
      edges: [
        edge(TRIGGER_ID, "n0"), edge("n0", "n1"), edge("n1", "n2"),
        edge("n2", "n3", "yes"), edge("n3", "n4"), edge("n2", "n5", "no"), edge("n5", "n6"),
      ],
    }),
  },
  {
    id: "ab_test",
    name: "A/B test",
    description: "Half of the people get version A, half get version B. Compare the results.",
    steps: "2 emails · split",
    build: () => ({
      nodes: [
        { id: "n0", type: "split", data: { percentA: 50 } },
        email("n1", "Version A subject", "<p>Version A of your email.</p>"),
        email("n2", "Version B subject", "<p>Version B of your email.</p>"),
      ],
      edges: [edge(TRIGGER_ID, "n0"), edge("n0", "n1", "a"), edge("n0", "n2", "b")],
    }),
  },
  {
    id: "blank",
    name: "Start from scratch",
    description: "Only the trigger. Drag your own steps onto the canvas.",
    steps: "empty",
    build: () => ({ nodes: [], edges: [] }),
  },
];

export const AUTOMATION_RECIPES: Recipe[] = RECIPES.map(({ id, name, description, steps }) => ({ id, name, description, steps }));

export function recipeFlow(id: string, trigger: TriggerData): Flow {
  const recipe = RECIPES.find((r) => r.id === id) ?? RECIPES[RECIPES.length - 1];
  const { nodes, edges } = recipe.build();
  const all = [{ id: TRIGGER_ID, type: "trigger", data: trigger } as Draft, ...nodes].map((n) => ({ ...n, x: 0, y: 0 }) as FlowNode);
  return autoLayout({ version: 2, nextKey: nodes.length, nodes: all, edges });
}

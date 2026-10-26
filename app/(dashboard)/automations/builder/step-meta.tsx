import {
  CircleStop, Clock, FolderMinus, FolderPlus, GitBranch, Mail, Split, Tag, TagsIcon, Zap, type LucideIcon,
} from "lucide-react";
import type { FlowNode, FlowNodeType } from "@/lib/automation-flow";

// How each kind of step looks on the canvas and in the palette.
export const STEP_LOOK: Record<FlowNodeType, { title: string; icon: LucideIcon; tint: string }> = {
  trigger: { title: "Trigger", icon: Zap, tint: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  email: { title: "Send email", icon: Mail, tint: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  wait: { title: "Wait", icon: Clock, tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  condition: { title: "If / else", icon: GitBranch, tint: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300" },
  split: { title: "A/B split", icon: Split, tint: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  action: { title: "Update contact", icon: TagsIcon, tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  exit: { title: "Exit", icon: CircleStop, tint: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300" },
};

export const ACTION_TITLE = {
  add_tag: "Add tag",
  remove_tag: "Remove tag",
  add_list: "Add to list",
  remove_list: "Remove from list",
} as const;

export function stepTitle(step: FlowNode) {
  if (step.type === "action") return ACTION_TITLE[(step.data as { kind: keyof typeof ACTION_TITLE }).kind];
  return STEP_LOOK[step.type].title;
}

export type PaletteItem = { type: Exclude<FlowNodeType, "trigger">; kind?: string; label: string; hint: string; icon: LucideIcon };

export const PALETTE: { group: string; items: PaletteItem[] }[] = [
  {
    group: "Messages",
    items: [{ type: "email", label: "Send email", hint: "Send one email", icon: Mail }],
  },
  {
    group: "Timing and logic",
    items: [
      { type: "wait", label: "Wait", hint: "Pause for minutes, hours, or days", icon: Clock },
      { type: "condition", label: "If / else", hint: "Two paths: yes and no", icon: GitBranch },
      { type: "split", label: "A/B split", hint: "Test two paths", icon: Split },
    ],
  },
  {
    group: "Contact",
    items: [
      { type: "action", kind: "add_tag", label: "Add tag", hint: "Tag the person", icon: Tag },
      { type: "action", kind: "remove_tag", label: "Remove tag", hint: "Remove a tag", icon: Tag },
      { type: "action", kind: "add_list", label: "Add to list", hint: "Put the person in a list", icon: FolderPlus },
      { type: "action", kind: "remove_list", label: "Remove from list", hint: "Take the person out of a list", icon: FolderMinus },
    ],
  },
  {
    group: "End",
    items: [{ type: "exit", label: "Exit", hint: "The person leaves here", icon: CircleStop }],
  },
];

const quote = (s: string, max = 32) => `"${s.length > max ? `${s.slice(0, max - 1)}…` : s}"`;

/** One line that says what a step does, in plain words. */
export function stepSummary(
  step: FlowNode,
  names: { list: (id: string) => string | undefined; email: (id: string) => string | undefined }
): string {
  switch (step.type) {
    case "trigger": {
      const { triggerType, triggerValue } = step.data;
      if (!triggerValue) return "Choose what starts this automation";
      return triggerType === "list_joined"
        ? `When someone joins ${quote(names.list(triggerValue) ?? "a deleted list")}`
        : `When the tag ${quote(triggerValue)} is added`;
    }
    case "email":
      return step.data.subject ? step.data.subject : "No subject yet";
    case "wait": {
      const { amount, unit } = step.data;
      return `Wait ${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
    }
    case "condition": {
      const { kind, value } = step.data;
      if (!value) return "Choose what to check";
      if (kind === "has_tag") return `Has the tag ${quote(value)}?`;
      if (kind === "in_list") return `Is in ${quote(names.list(value) ?? "a deleted list")}?`;
      const email = names.email(value) ?? "a deleted email";
      return kind === "opened" ? `Opened ${quote(email)}?` : `Clicked a link in ${quote(email)}?`;
    }
    case "split":
      return `A: ${step.data.percentA}% · B: ${100 - step.data.percentA}%`;
    case "action": {
      const { kind, value } = step.data;
      if (!value) return "Choose what to change";
      if (kind === "add_tag") return `Add the tag ${quote(value)}`;
      if (kind === "remove_tag") return `Remove the tag ${quote(value)}`;
      const list = quote(names.list(value) ?? "a deleted list");
      return kind === "add_list" ? `Add to ${list}` : `Remove from ${list}`;
    }
    case "exit":
      return "The person leaves the automation";
  }
}

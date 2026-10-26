// The old step format: automations saved before the workflow builder kept a plain list of steps
// in the "steps" column. lib/automation-flow.ts turns such a list into a workflow (fromLegacySteps).
export type EmailStep = { type: "email"; subject: string; html: string };
export type WaitStep = { type: "wait"; amount: number; unit: "minutes" | "hours" | "days" };
export type Step = EmailStep | WaitStep;

export const MAX_AUTOMATIONS = 20;

export type EmailStep = { type: "email"; subject: string; html: string };
export type WaitStep = { type: "wait"; amount: number; unit: "minutes" | "hours" | "days" };
export type Step = EmailStep | WaitStep;

export const MAX_STEPS = 10;
export const MAX_AUTOMATIONS = 20;
export const MAX_STEPS_JSON = 60000;

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;
export const MAX_WAIT_MS = 60 * UNIT_MS.days;

export const waitMs = (s: WaitStep) => s.amount * UNIT_MS[s.unit];

// Returns clean steps, or null if the data is not valid.
export function parseSteps(input: unknown): Step[] | null {
  if (!Array.isArray(input) || input.length > MAX_STEPS) return null;
  const out: Step[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;

    if (s.type === "email") {
      out.push({
        type: "email",
        subject: String(s.subject ?? "").replace(/[\r\n]/g, " ").trim().slice(0, 200),
        html: String(s.html ?? "").slice(0, 8000),
      });
    } else if (s.type === "wait") {
      const amount = Math.floor(Number(s.amount));
      const unit = s.unit;
      if (unit !== "minutes" && unit !== "hours" && unit !== "days") return null;
      if (!Number.isFinite(amount) || amount < 1) return null;
      if (amount * UNIT_MS[unit] > MAX_WAIT_MS) return null; // longest wait: 60 days
      out.push({ type: "wait", amount, unit });
    } else {
      return null;
    }
  }
  return out;
}
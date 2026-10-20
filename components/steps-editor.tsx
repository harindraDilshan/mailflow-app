"use client";

import { useState } from "react";
import type { Step } from "@/lib/automation-rules";

export function StepsEditor({ initial }: { initial: Step[] }) {
  const [steps, setSteps] = useState<Step[]>(initial);
  const input = "w-full rounded border px-2 py-1 text-sm";

  const set = (i: number, s: Step) => setSteps(steps.map((x, k) => (k === i ? s : x)));
  const remove = (i: number) => setSteps(steps.filter((_, k) => k !== i));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const copy = [...steps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setSteps(copy);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      {steps.map((s, i) => (
        <div key={i} className="rounded border p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <b>{i + 1}. {s.type === "email" ? "Send email" : "Wait"}</b>
            <span className="space-x-3">
              <button type="button" onClick={() => move(i, -1)}>↑</button>
              <button type="button" onClick={() => move(i, 1)}>↓</button>
              <button type="button" onClick={() => remove(i)}>Remove</button>
            </span>
          </div>

          {s.type === "email" ? (
            <div className="space-y-2">
              <input
                className={input} placeholder="Subject" value={s.subject}
                onChange={(e) => set(i, { ...s, subject: e.target.value })}
              />
              <textarea
                className={`${input} font-mono text-xs`} rows={6}
                placeholder="Email content (HTML). Use {{name}} for the contact's name."
                value={s.html}
                onChange={(e) => set(i, { ...s, html: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              Wait
              <input
                type="number" min={1} className="w-20 rounded border px-2 py-1" value={s.amount}
                onChange={(e) => set(i, { ...s, amount: Number(e.target.value) })}
              />
              <select
                className="rounded border px-2 py-1" value={s.unit}
                onChange={(e) => set(i, { ...s, unit: e.target.value as "minutes" | "hours" | "days" })}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2 text-sm">
        <button type="button" className="rounded border px-3 py-1"
          onClick={() => setSteps([...steps, { type: "email", subject: "", html: "" }])}>+ Email</button>
        <button type="button" className="rounded border px-3 py-1"
          onClick={() => setSteps([...steps, { type: "wait", amount: 1, unit: "days" }])}>+ Wait</button>
      </div>
    </div>
  );
}
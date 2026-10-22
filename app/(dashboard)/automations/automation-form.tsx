"use client";

import { useActionState, useState } from "react";

import type { Step } from "@/lib/automation-rules";
import { StepsEditor } from "@/components/steps-editor";

type State = { error?: string; message?: string } | undefined;

export function AutomationForm({
  action,
  lists,
  automation,
  initialSteps,
  locked,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  lists: { id: string; name: string }[];
  automation?: {
    id: string; name: string; triggerType: string; triggerValue: string;
    fromName: string; fromEmail: string;
  };
  initialSteps: Step[];
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState(automation?.triggerType ?? "list_joined");
  const input = "w-full rounded border px-3 py-2";

  return (
    <form action={formAction} className="max-w-2xl space-y-4 text-sm">
      {automation && <input type="hidden" name="id" value={automation.id} />}

      <fieldset disabled={locked} className="space-y-4">
        <label className="block">Name
          <input name="name" required defaultValue={automation?.name} className={input} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">Start when
            <select name="triggerType" value={type} onChange={(e) => setType(e.target.value)} className={input}>
              <option value="list_joined">someone joins a list</option>
              <option value="tag_added">a tag is added to someone</option>
            </select>
          </label>
          {type === "list_joined" ? (
            <label className="block">List
              <select key="list" name="triggerValue" defaultValue={automation?.triggerValue} className={input}>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="block">Tag
              <input key="tag" name="triggerValue" placeholder="vip" defaultValue={automation?.triggerType === "tag_added" ? automation.triggerValue : ""} className={input} />
            </label>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">Sender name
            <input name="fromName" defaultValue={automation?.fromName} className={input} />
          </label>
          <label className="block">Sender email
            <input name="fromEmail" type="email" required placeholder="hello@mail.yourdomain.com" defaultValue={automation?.fromEmail} className={input} />
          </label>
        </div>

        <div>
          <p className="mb-2 font-medium">Steps</p>
          <StepsEditor initial={initialSteps} />
        </div>
      </fieldset>

      {locked && <p className="text-gray-600">This automation is active. Pause it to edit.</p>}
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.message && <p className="text-green-700">{state.message}</p>}
      <button disabled={pending || locked} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
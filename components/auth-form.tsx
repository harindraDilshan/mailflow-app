"use client";

import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;
type Field = { name: string; label: string; type?: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="mb-1 block text-sm">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>
      ))}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      <button
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}
"use client";

import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;

const SAMPLE = `<h1>Hello {{name}}</h1>
<p>This is a test email from my platform.</p>`;

export function CampaignForm({
  action,
  lists,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  lists: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const input = "w-full rounded border px-3 py-2";

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <label className="block text-sm">Campaign name (only you see this)
        <input name="name" required className={input} />
      </label>
      <label className="block text-sm">Subject
        <input name="subject" required className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Sender name
          <input name="fromName" className={input} />
        </label>
        <label className="block text-sm">Sender email
          <input name="fromEmail" type="email" required placeholder="hello@mail.yourdomain.com" className={input} />
        </label>
      </div>

      <fieldset className="text-sm">
        <legend className="mb-1">Who gets it?</legend>
        <label className="mr-4 inline-flex items-center gap-1">
          <input type="checkbox" name="audienceAll" /> All active contacts
        </label>
        {lists.map((l) => (
          <label key={l.id} className="mr-4 inline-flex items-center gap-1">
            <input type="checkbox" name="listIds" value={l.id} /> {l.name}
          </label>
        ))}
      </fieldset>

      <label className="block text-sm">Email content (HTML). Use {"{{name}}"} for the contact's name.
        <textarea name="html" required rows={10} defaultValue={SAMPLE} className={`${input} font-mono text-xs`} />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : "Save as draft"}
      </button>
    </form>
  );
}
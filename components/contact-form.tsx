"use client";

import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;

export function ContactForm({
  action,
  lists,
  submitLabel,
  contact,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  lists: { id: string; name: string }[];
  submitLabel: string;
  contact?: { id: string; email: string; name: string; tags: string[]; listIds: string[] };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm">Email</label>
        <input
          id="email" name="email" type="email" required
          readOnly={!!contact} defaultValue={contact?.email}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm">Name</label>
        <input
          id="name" name="name" defaultValue={contact?.name}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="tags" className="mb-1 block text-sm">Tags (separate with commas)</label>
        <input
          id="tags" name="tags" placeholder="vip, newsletter"
          defaultValue={contact?.tags.join(", ")}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      {lists.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm">Lists</legend>
          {lists.map((l) => (
            <label key={l.id} className="mr-4 inline-flex items-center gap-1 text-sm">
              <input
                type="checkbox" name="listIds" value={l.id}
                defaultChecked={contact?.listIds.includes(l.id)}
              />
              {l.name}
            </label>
          ))}
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}
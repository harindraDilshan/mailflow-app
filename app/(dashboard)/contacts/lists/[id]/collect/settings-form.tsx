"use client";

import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;

export function CollectSettingsForm({
  action,
  list,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  list: { id: string; hostedEnabled: boolean; pageTitle: string; pageText: string; fromName: string; fromEmail: string };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const input = "w-full rounded border px-3 py-2";

  return (
    <form action={formAction} className="max-w-lg space-y-3 text-sm">
      <input type="hidden" name="id" value={list.id} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="hostedEnabled" defaultChecked={list.hostedEnabled} />
        Turn on the hosted sign-up page
      </label>
      <label className="block">Page title
        <input name="pageTitle" defaultValue={list.pageTitle} className={input} />
      </label>
      <label className="block">Short text under the title
        <textarea name="pageText" rows={3} defaultValue={list.pageText} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">Confirmation email: sender name
          <input name="fromName" defaultValue={list.fromName} className={input} />
        </label>
        <label className="block">Confirmation email: sender address
          <input name="fromEmail" type="email" placeholder="hello@mail.yourdomain.com" defaultValue={list.fromEmail} className={input} />
        </label>
      </div>
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.message && <p className="text-green-700">{state.message}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
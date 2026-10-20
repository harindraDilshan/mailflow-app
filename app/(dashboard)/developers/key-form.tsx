"use client";

import { useActionState, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type State = { error?: string; message?: string; key?: string } | undefined;

export function KeyForm({
  action,
  lists,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  lists: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState("public");
  const input = "w-full rounded border px-3 py-2";

  return (
    <form action={formAction} className="max-w-lg space-y-3 text-sm">
      <label className="block">Name
        <input name="name" required placeholder="Website sign-up form" className={input} />
      </label>
      <label className="block">Type
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={input}>
          <option value="public">Public key (for a web page, can only subscribe to one list)</option>
          <option value="secret">Secret key (for your server only)</option>
        </select>
      </label>

      {type === "public" && (
        <>
          <label className="block">List
            <select name="listId" className={input}>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block">Allowed websites (one per line)
            <textarea name="origins" rows={3} placeholder={"https://www.exlorian.com\nhttps://exlorian.com"} className={input} />
          </label>
        </>
      )}

      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.message && <p className="text-green-700">{state.message}</p>}
      {state?.key && (
        <p className="rounded border bg-yellow-50 p-2">
          <code className="break-all">{state.key}</code> <CopyButton text={state.key} />
        </p>
      )}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Creating..." : "Create key"}
      </button>
    </form>
  );
}
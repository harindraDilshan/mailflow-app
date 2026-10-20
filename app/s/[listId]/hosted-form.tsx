"use client";

import { useActionState } from "react";
import { hostedSubscribe } from "./actions";

export function HostedForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(hostedSubscribe, undefined);
  const input = "w-full rounded border px-3 py-2";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="listId" value={listId} />
      <input name="name" placeholder="Your name" className={input} />
      <input name="email" type="email" required placeholder="Your email" className={input} />
      <input
        name="hp_field" tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Please wait..." : "Subscribe"}
      </button>
    </form>
  );
}
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { error?: string; message?: string } | undefined;
type Field = { name: string; label: string; type?: string; placeholder?: string };

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
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-xs font-medium text-foreground">
            {f.label}
          </label>
          <Input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            required
          />
        </div>
      ))}
      {state?.error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="rounded-md border border-border bg-muted p-2 text-xs text-muted-foreground">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : submitLabel}
      </Button>
    </form>
  );
}

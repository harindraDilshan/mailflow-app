"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { placeholders } from "@/src/lib/placeholders";

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
  contact?: { id: string; email: string; name: string; tags: string[]; listIds: string[]; note?: string };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-foreground">
          {placeholders.email}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          readOnly={Boolean(contact)}
          defaultValue={contact?.email}
          placeholder="email@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-medium text-foreground">
          {placeholders.name}
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={contact?.name}
          placeholder={placeholders.name}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tags" className="text-xs font-medium text-foreground">
          Tags
        </label>
        <Input
          id="tags"
          name="tags"
          placeholder="vip, newsletter"
          defaultValue={contact?.tags.join(", ")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="note" className="text-xs font-medium text-foreground">
          Private note
        </label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Private note"
          defaultValue={contact?.note ?? ""}
        />
      </div>

      {lists.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-foreground">Lists</legend>
          <div className="flex flex-wrap gap-4">
            {lists.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  name="listIds"
                  value={l.id}
                  defaultChecked={contact?.listIds.includes(l.id)}
                  className="rounded border-input text-primary focus:ring-ring"
                />
                {l.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state?.error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : submitLabel}
      </Button>
    </form>
  );
}

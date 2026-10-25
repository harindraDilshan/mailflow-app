"use client";

import { useActionState, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

  return (
    <form action={formAction} className="max-w-lg space-y-4 text-xs">
      <div className="space-y-1.5">
        <label htmlFor="key-name" className="font-medium text-foreground">
          Key Name
        </label>
        <Input
          id="key-name"
          name="name"
          required
          placeholder="e.g. Production Blog Sign-up"
          className="h-8"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="key-type" className="font-medium text-foreground">
          Key Type
        </label>
        <select
          id="key-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="public">Public key (browser-safe, single list subscribe)</option>
          <option value="secret">Secret key (backend only, unrestricted access)</option>
        </select>
      </div>

      {type === "public" && (
        <>
          <div className="space-y-1.5">
            <label htmlFor="key-list" className="font-medium text-foreground">
              Designated Subscriber List
            </label>
            <select
              id="key-list"
              name="listId"
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="key-origins" className="font-medium text-foreground">
              Allowed Website Domains (one per line)
            </label>
            <Textarea
              id="key-origins"
              name="origins"
              rows={3}
              placeholder={"https://example.com\nhttps://www.example.com"}
            />
          </div>
        </>
      )}

      {state?.error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-destructive">
          {state.error}
        </p>
      )}

      {state?.message && (
        <p className="rounded-md border border-border bg-muted p-2 text-muted-foreground">
          {state.message}
        </p>
      )}

      {state?.key && (
        <div className="space-y-1.5 rounded-md border border-border bg-muted/60 p-3">
          <p className="text-[11px] font-medium text-foreground">
            Copy your new API key now. It will not be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-background p-1.5 font-mono text-[11px] border border-border">
              {state.key}
            </code>
            <CopyButton text={state.key} />
          </div>
        </div>
      )}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Creating..." : "Generate Key"}
      </Button>
    </form>
  );
}

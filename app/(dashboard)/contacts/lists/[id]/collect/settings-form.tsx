"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useActionForm } from "@/hooks/use-action-form";

type State = { error?: string; message?: string } | undefined;

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

export function CollectSettingsForm({
  action,
  list,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  list: { id: string; hostedEnabled: boolean; pageTitle: string; pageText: string; fromName: string; fromEmail: string };
}) {
  const { state, pending, onSubmit } = useActionForm(async (prev: State, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.message) toast.success(res.message);
    return res;
  }, undefined);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="id" value={list.id} />

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3">
        <span className="space-y-0.5">
          <span className={`block ${label}`}>Hosted sign-up page</span>
          <span className={`block ${hint}`}>A public page where people can join this list. No website needed.</span>
        </span>
        <Switch name="hostedEnabled" defaultChecked={list.hostedEnabled} />
      </label>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pageTitle" className={label}>
            Page title
          </label>
          <Input id="pageTitle" name="pageTitle" maxLength={120} defaultValue={list.pageTitle} placeholder="Join our newsletter" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pageText" className={label}>
            Short text under the title
          </label>
          <Textarea
            id="pageText"
            name="pageText"
            rows={3}
            maxLength={500}
            defaultValue={list.pageText}
            placeholder="One email a week with our best tips. Unsubscribe at any time."
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <p className={label}>Confirmation email sender</p>
          <p className={hint}>
            New subscribers get a confirmation email from this address first. Use an address on a verified domain.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="fromName" className={label}>
              Sender name
            </label>
            <Input id="fromName" name="fromName" maxLength={100} defaultValue={list.fromName} placeholder="Acme Team" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fromEmail" className={label}>
              Sender address
            </label>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              defaultValue={list.fromEmail}
              placeholder="hello@mail.yourdomain.com"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}

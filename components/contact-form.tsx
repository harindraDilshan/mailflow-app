"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/tag-input";
import { useActionForm } from "@/hooks/use-action-form";
import type { ContactFormState } from "@/app/(dashboard)/contacts/actions";

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

export function ContactForm({
  action,
  lists,
  contact,
}: {
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  lists: { id: string; name: string }[];
  // No contact = "add" form. With a contact = "edit" form (the email cannot change).
  contact?: { id: string; name: string; tags: string[]; listIds: string[]; note?: string };
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const editing = Boolean(contact);

  const { state, pending, onSubmit } = useActionForm(async (prev: ContactFormState, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.message) {
      toast.success(res.message);
      if (!editing) {
        if (res.addAnother) setFormKey((k) => k + 1); // empty form for the next contact
        else router.push("/contacts");
      }
    }
    return res;
  }, undefined);

  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-5">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      {!editing && (
        <div className="space-y-1.5">
          <label htmlFor="email" className={label}>
            Email <span className="text-destructive">*</span>
          </label>
          <Input id="email" name="email" type="email" required autoFocus placeholder="jane@example.com" />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className={label}>
          Name
        </label>
        <Input id="name" name="name" defaultValue={contact?.name} placeholder="Jane Doe" autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tags" className={label}>
          Tags
        </label>
        <TagInput id="tags" name="tags" defaultValue={contact?.tags} aria-describedby="tags-hint" />
        <p id="tags-hint" className={hint}>
          Press Enter or type a comma after each tag. Use tags to group and filter contacts.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className={label}>Lists</legend>
        {lists.length === 0 ? (
          <p className={hint}>
            You have no lists yet.{" "}
            <Link href="/contacts/lists" className="underline underline-offset-2 hover:text-foreground">
              Create a list
            </Link>{" "}
            to group your contacts.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lists.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                <Checkbox name="listIds" value={l.id} defaultChecked={contact?.listIds.includes(l.id)} />
                <span className="truncate">{l.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="note" className={label}>
          Private note
        </label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          maxLength={2000}
          placeholder="Only your team can see this note."
          defaultValue={contact?.note ?? ""}
        />
      </div>

      {!editing && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3">
          <Checkbox name="consent" required className="mt-0.5" />
          <span className="space-y-0.5">
            <span className="block text-xs font-medium text-foreground">This person agreed to get emails from me</span>
            <span className={`block ${hint}`}>
              Add only people who gave you permission. Mailflow saves today as the consent date.
            </span>
          </span>
        </label>
      )}

      {state?.error && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {state.error}{" "}
          {state.existingId && (
            <Link href={`/contacts/${state.existingId}`} className="font-medium underline underline-offset-2">
              Open this contact
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {editing ? (
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        ) : (
          <>
            <Button type="submit" name="intent" value="another" variant="outline" disabled={pending}>
              Add and add another
            </Button>
            <Button type="submit" name="intent" value="done" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Add contact
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

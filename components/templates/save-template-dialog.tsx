"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveAsTemplate } from "@/app/(dashboard)/templates/actions";
import type { EmailDesign } from "@/lib/email-design";

/** Saves the current email content as a new template in "My templates". */
export function SaveTemplateDialog({
  open,
  onOpenChange,
  defaultName,
  content,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  content: () => { design: EmailDesign | null; html: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(fd: FormData) {
    const c = content();
    fd.set("design", c.design ? JSON.stringify(c.design) : "");
    fd.set("html", c.design ? "" : c.html);
    startTransition(async () => {
      try {
        const res = await saveAsTemplate(fd);
        if (!res.ok) return setError(res.message);
        setError("");
        onOpenChange(false);
        toast.success(res.message, {
          action: res.id ? { label: "Open", onClick: () => router.push(`/templates/${res.id}`) } : undefined,
        });
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) onOpenChange(o);
        if (!o) setError("");
      }}
    >
      <DialogContent>
        {/* Its own form: the dialog can be inside the campaign form, and forms cannot be nested. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            submit(new FormData(e.currentTarget));
          }}
          onChange={(e) => e.stopPropagation()}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Saves a copy of this content in My templates. You can use it again in other campaigns and automations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="template-name" className="text-xs font-medium">Template name</label>
            <Input id="template-name" name="name" required maxLength={150} defaultValue={defaultName} autoFocus />
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useActionForm } from "@/hooks/use-action-form";
import { createList, renameList } from "../actions";

type State = { error?: string; message?: string } | undefined;

// Create a list (no `list`) or rename one.
export function ListDialog({
  list,
  open,
  onClose,
}: {
  list?: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}) {
  const { state, pending, onSubmit } = useActionForm(async (prev: State, fd: FormData) => {
    const res = await (list ? renameList : createList)(prev, fd);
    if (res?.message) {
      toast.success(res.message);
      onClose();
    }
    return res;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{list ? "Rename list" : "New list"}</DialogTitle>
            <DialogDescription>
              {list
                ? "Contacts, sign-up forms, and automations keep using this list."
                : "Use lists to group contacts, for example by topic or by product."}
            </DialogDescription>
          </DialogHeader>
          {list && <input type="hidden" name="id" value={list.id} />}
          <div className="space-y-1.5">
            <label htmlFor="list-name" className="text-xs font-medium text-foreground">
              List name
            </label>
            <Input
              id="list-name"
              name="name"
              defaultValue={list?.name}
              maxLength={100}
              required
              autoFocus
              autoComplete="off"
              placeholder="Weekly newsletter"
            />
          </div>
          {state?.error && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {list ? "Save" : "Create list"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewListButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <Button
        size={size}
        onClick={() => {
          setKey((k) => k + 1); // a fresh form every time
          setOpen(true);
        }}
      >
        <Plus />
        New list
      </Button>
      <ListDialog key={key} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

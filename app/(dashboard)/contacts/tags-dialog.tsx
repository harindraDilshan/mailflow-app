"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TagInput } from "@/components/tag-input";
import { plural } from "@/lib/format";

export function TagsDialog({
  mode,
  count,
  onClose,
  onApply,
}: {
  mode: "add" | "remove" | null;
  count: number;
  onClose: () => void;
  onApply: (tags: string[]) => Promise<void>;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const adding = mode !== "remove";

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {adding ? `Add tags to ${plural(count, "contact")}` : `Remove tags from ${plural(count, "contact")}`}
          </DialogTitle>
          <DialogDescription>
            {adding
              ? "Automations that start when a tag is added run for active contacts."
              : "Only these tags are removed. The other tags stay."}
          </DialogDescription>
        </DialogHeader>
        <TagInput onChange={setTags} placeholder="vip, newsletter" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending || tags.length === 0}
            onClick={() =>
              startTransition(async () => {
                await onApply(tags);
                onClose();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {adding ? "Add tags" : "Remove tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

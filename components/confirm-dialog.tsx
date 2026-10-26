"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | void;
};

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  // Keep the last text while the dialog plays its close animation.
  const [shown, setShown] = useState(options);
  if (options && options !== shown) setShown(options);

  return (
    <AlertDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{shown?.title}</AlertDialogTitle>
          <AlertDialogDescription>{shown?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={shown?.destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await shown?.onConfirm();
                onClose();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {shown?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** const [dialog, confirm] = useConfirm(); ... confirm({ title, ... }); ... return <>{dialog}</> */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialog = <ConfirmDialog options={options} onClose={() => setOptions(null)} />;
  return [dialog, setOptions] as const;
}

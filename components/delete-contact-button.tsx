"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { placeholders } from "@/src/lib/placeholders";

export function DeleteContactButton({
  action,
  contactId,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  contactId: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="id" value={contactId} />
      </form>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" className={className} />}>
          {placeholders.delete}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{placeholders.alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{placeholders.alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{placeholders.alertDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              {placeholders.alertDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

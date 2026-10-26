"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, Copy, Loader2, MailX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/confirm-dialog";
import { canArchive, canDelete, canUnarchive, canUnsubscribe } from "@/lib/contact-status";
import {
  bulkArchiveContacts, bulkDeleteContacts, bulkUnarchiveContacts, bulkUnsubscribeContacts, type ActionResult,
} from "../actions";

// The buttons at the top of one contact's page.
export function ContactActions({ contact }: { contact: { id: string; email: string; status: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const s = contact.status;

  async function run(action: (fd: FormData) => Promise<ActionResult>, after?: () => void) {
    const fd = new FormData();
    fd.append("ids", contact.id);
    try {
      const res = await action(fd);
      if (res.ok) {
        toast.success(res.message);
        after?.();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          navigator.clipboard.writeText(contact.email).then(
            () => toast.success("Email copied."),
            () => toast.error("Could not copy the email.")
          )
        }
      >
        <Copy />
        Copy email
      </Button>

      {(canArchive(s) || canUnarchive(s) || canUnsubscribe(s) || canDelete(s)) && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
            {pending && <Loader2 className="animate-spin" />}
            Actions
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canArchive(s) && (
              <DropdownMenuItem onClick={() => startTransition(() => run(bulkArchiveContacts))}>
                <Archive />
                Archive
              </DropdownMenuItem>
            )}
            {canUnarchive(s) && (
              <DropdownMenuItem onClick={() => startTransition(() => run(bulkUnarchiveContacts))}>
                <ArchiveRestore />
                Unarchive
              </DropdownMenuItem>
            )}
            {canUnsubscribe(s) && (
              <DropdownMenuItem
                onClick={() =>
                  confirm({
                    title: `Unsubscribe ${contact.email}?`,
                    description:
                      "This person will get no more campaigns or automation emails. You cannot undo this, and they cannot sign up again with a form.",
                    confirmLabel: "Unsubscribe",
                    destructive: true,
                    onConfirm: () => run(bulkUnsubscribeContacts),
                  })
                }
              >
                <MailX />
                Unsubscribe
              </DropdownMenuItem>
            )}
            {canDelete(s) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    confirm({
                      title: `Delete ${contact.email}?`,
                      description:
                        "This deletes the contact and its details. You cannot undo this. To stop emails but keep a record, use Unsubscribe.",
                      confirmLabel: "Delete contact",
                      destructive: true,
                      onConfirm: () => run(bulkDeleteContacts, () => router.push("/contacts")),
                    })
                  }
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {confirmDialog}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Globe, MoreHorizontal, PencilLine, Trash2, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/confirm-dialog";
import { formatDate, formatNumber, plural } from "@/lib/format";
import { deleteList } from "../actions";
import { ListDialog } from "./list-dialog";

export type ListSummary = {
  id: string;
  name: string;
  createdAt: string;
  active: number;
  total: number;
  signupOn: boolean;
};

export function ListsTable({ lists }: { lists: ListSummary[] }) {
  // The target stays set while the dialog closes, so its title does not change during the animation.
  const [renaming, setRenaming] = useState<ListSummary | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [confirmDialog, confirm] = useConfirm();

  function askDelete(l: ListSummary) {
    confirm({
      title: `Delete the list "${l.name}"?`,
      description: `The ${plural(l.total, "contact")} in this list are not deleted. Automations that start when someone joins this list stop, and its sign-up page and form stop taking sign-ups. You cannot undo this.`,
      confirmLabel: "Delete list",
      destructive: true,
      onConfirm: async () => {
        const fd = new FormData();
        fd.append("id", l.id);
        try {
          const res = await deleteList(fd);
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        } catch {
          toast.error("Something went wrong. Try again.");
        }
      },
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs">Name</TableHead>
              <TableHead className="text-right text-xs">Active</TableHead>
              <TableHead className="hidden text-right text-xs sm:table-cell">All contacts</TableHead>
              <TableHead className="hidden text-xs md:table-cell">Sign-up form</TableHead>
              <TableHead className="hidden text-xs md:table-cell">Created</TableHead>
              <TableHead className="w-10 pr-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="max-w-64 pl-4">
                  <Link href={`/contacts?list=${l.id}`} className="block truncate text-sm font-medium hover:underline">
                    {l.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatNumber(l.active)}</TableCell>
                <TableCell className="hidden text-right text-xs text-muted-foreground tabular-nums sm:table-cell">
                  {formatNumber(l.total)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={l.signupOn ? "secondary" : "outline"} className="font-normal">
                    {l.signupOn ? "On" : "Off"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground tabular-nums md:table-cell">
                  {formatDate(l.createdAt)}
                </TableCell>
                <TableCell className="pr-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${l.name}`} />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem render={<Link href={`/contacts?list=${l.id}`} />}>
                        <Users />
                        View contacts
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`/contacts/lists/${l.id}/collect`} />}>
                        <Globe />
                        Collect subscribers
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDialogKey((k) => k + 1);
                          setRenaming(l);
                          setRenameOpen(true);
                        }}
                      >
                        <PencilLine />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => askDelete(l)}>
                        <Trash2 />
                        Delete list
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ListDialog
        key={dialogKey}
        list={renaming ?? undefined}
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
      />
      {confirmDialog}
    </>
  );
}

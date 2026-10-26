"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, KeyRound, Loader2, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/copy-button";
import { CodeTabs } from "@/components/docs/code-tabs";
import { FormMessage } from "@/components/auth/form-message";
import { LocalTime } from "@/components/local-time";
import { useConfirm } from "@/components/confirm-dialog";
import { runAction } from "@/components/run-action";
import { useActionForm } from "@/hooks/use-action-form";
import { subscribeSamples } from "@/lib/docs/api-examples";
import { createSecretKey, revokeKey, type CreateKeyState } from "./actions";

export type KeyItem = {
  id: string;
  name: string;
  type: "public" | "secret";
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: string;
  listId: string | null;
  listName: string | null;
  origins: string[];
};

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground mt-0.5">
          {n}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}

function CreateKeyDialog({
  open,
  onClose,
  base,
  listId,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  listId: string;
}) {
  const { state, pending, onSubmit } = useActionForm<CreateKeyState>(createSecretKey, undefined);
  const [copied, setCopied] = useState(false);
  const created = state?.key;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && (!created || copied) && onClose()}>
      <DialogContent className={created ? "sm:max-w-2xl" : "sm:max-w-md"} showCloseButton={!created || copied}>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your new key now</DialogTitle>
              <DialogDescription>
                &ldquo;{state?.name}&rdquo; is ready. For your safety, Mailflow shows the full key only this one time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs break-all">{created}</code>
                <CopyButton text={created} />
              </div>
              <FormMessage tone="info">
                Keep it in a secret store or an environment variable (for example MAILFLOW_SECRET_KEY). Never put it in a
                website, a mobile app, or a Git repository.
              </FormMessage>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Try it now: this request adds a test contact to your list</p>
                <CodeTabs samples={subscribeSamples({ base, listId, key: created })} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox checked={copied} onCheckedChange={(c) => setCopied(Boolean(c))} />
                I copied the key to a safe place
              </label>
            </div>
            <DialogFooter>
              <Button disabled={!copied} onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Create a server key</DialogTitle>
              <DialogDescription>
                A server key adds contacts to any of your lists. Use it only in code that runs on your server.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="key-name" className="text-xs font-medium">
                Name
              </label>
              <Input id="key-name" name="name" required autoFocus maxLength={100} placeholder="Online shop checkout" />
              <p className="text-[11px] text-muted-foreground">Where you use the key. It helps you later when you revoke keys.</p>
            </div>
            {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function KeysView({ keys, lists, base }: { keys: KeyItem[]; lists: { id: string; name: string }[]; base: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [confirmDialog, confirm] = useConfirm();

  const secret = keys.filter((k) => k.type === "secret");
  const activeSecret = secret.filter((k) => k.status === "active");
  const revoked = secret.filter((k) => k.status !== "active");
  const forms = keys.filter((k) => k.type === "public" && k.status === "active");
  const listId = lists[0]?.id ?? "LIST_ID";

  function openCreate() {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function askRevoke(k: KeyItem) {
    confirm({
      title: `Revoke "${k.name}"?`,
      description:
        k.type === "secret"
          ? "Every request with this key fails from now on. Update your code with a new key first. You cannot undo this."
          : `The sign-up form of "${k.listName ?? "the list"}" stops working on your websites. You can create a new embed code later.`,
      confirmLabel: "Revoke key",
      destructive: true,
      onConfirm: () => runAction(revokeKey, { id: k.id }),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Add contacts from your own code in three steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            <Step n={1} done={activeSecret.length > 0} title="Create a server key">
              {activeSecret.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  Create a server key
                </Button>
              )}
            </Step>
            <Step n={2} done={lists.length > 0} title="Choose the list to add people to">
              {lists.length === 0 ? (
                <Button size="sm" variant="outline" render={<Link href="/contacts/lists" />}>
                  Create a list
                </Button>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {lists.slice(0, 6).map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="truncate">{l.name}</span>
                      <span className="flex items-center gap-2">
                        <code className="font-mono text-[11px] text-muted-foreground">{l.id}</code>
                        <CopyButton text={l.id} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Step>
            <Step n={3} done={activeSecret.some((k) => k.lastUsedAt)} title="Send your first request">
              <CodeTabs samples={subscribeSamples({ base, listId })} />
              <p className="text-[11px] text-muted-foreground">
                The contact gets a confirmation email and joins the list after a click.{" "}
                <Link href="/docs/api/quickstart" className="underline underline-offset-2 hover:text-foreground">
                  Read the quickstart
                </Link>
              </p>
            </Step>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Server keys</CardTitle>
            <CardDescription>Secret. They add contacts to any list. Use them only on your server.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Create key
          </Button>
        </CardHeader>
        <CardContent>
          {activeSecret.length === 0 ? (
            <p className="text-xs text-muted-foreground">No server keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Created</TableHead>
                  <TableHead className="text-xs">Last used</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSecret.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-sm font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.prefix}••••••</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell"><LocalTime iso={k.createdAt} dateOnly /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? <LocalTime iso={k.lastUsedAt} /> : "Never"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Revoke ${k.name}`} onClick={() => askRevoke(k)}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {revoked.length > 0 && (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Revoked keys ({revoked.length})</summary>
              <ul className="mt-2 space-y-1">
                {revoked.map((k) => (
                  <li key={k.id} className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{k.name}</span>
                    <code className="font-mono">{k.prefix}••••••</code>
                    <Badge variant="outline" className="font-normal">Revoked</Badge>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Website form keys</CardTitle>
          <CardDescription>
            Public. Each sign-up form gets one when you create its embed code. It can only add people to that one list,
            and only from the websites you allow, so it is safe in a web page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              None yet. Open a list in{" "}
              <Link href="/contacts/forms" className="underline underline-offset-2 hover:text-foreground">Sign-up forms</Link>{" "}
              and choose &ldquo;Embed on website&rdquo;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Form</TableHead>
                  <TableHead className="hidden text-xs md:table-cell">Websites</TableHead>
                  <TableHead className="text-xs">Last used</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-sm font-medium">{k.listName ?? "A deleted list"}</TableCell>
                    <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground md:table-cell">{k.origins.join(", ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? <LocalTime iso={k.lastUsedAt} /> : "Never"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${k.name}`} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {k.listId && k.listName && (
                            <DropdownMenuItem render={<Link href={`/contacts/lists/${k.listId}/collect?tab=embed`} />}>
                              <Settings2 />
                              Manage form
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => askRevoke(k)}>
                            <Trash2 />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="mt-px size-3.5 shrink-0" />
        A server key was in a public place (a website, an app, a Git repository)? Revoke it now and create a new one.
      </p>
      <p className="text-[11px] text-muted-foreground">
        <BookOpen className="mr-1 inline size-3.5" />
        Everything about the API is in the{" "}
        <Link href="/docs/api" className="underline underline-offset-2 hover:text-foreground">API docs</Link>.
      </p>

      <CreateKeyDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} base={base} listId={listId} />
      {confirmDialog}
    </div>
  );
}


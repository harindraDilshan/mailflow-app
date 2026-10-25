import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { listApiKeys } from "@/lib/api-keys";
import { KeyForm } from "./key-form";
import { createKey, revokeKey } from "./actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Key } from "lucide-react";

export default async function DevelopersPage() {
  const user = await requireUser();
  const [keys, lists] = await Promise.all([listApiKeys(user.$id), listOwnedLists(user.$id)]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            API & Developers
          </h1>
          <p className="text-xs text-muted-foreground">
            Generate and manage API keys for website subscribe forms and server integrations
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/developers/docs" />}>
          <BookOpen className="size-3.5" />
          <span>API Documentation</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Scope / Allowed Websites</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                  No API keys created yet. Generate a key below to connect your frontend or backend.
                </TableCell>
              </TableRow>
            )}
            {keys.map((k) => (
              <TableRow key={k.$id}>
                <TableCell className="font-medium text-xs">{k.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">{k.type}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <code>{k.prefix}…</code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {k.type === "public"
                    ? `${listName.get(k.listId ?? "") ?? "Single list"} (${(k.allowedOrigins ?? []).join(", ") || "Any origin"})`
                    : "All lists (Server-side)"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <Badge variant={k.status === "active" ? "default" : "outline"} className="text-[10px]">
                    {k.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {k.status === "active" && (
                    <form action={revokeKey}>
                      <input type="hidden" name="id" value={k.$id} />
                      <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                        Revoke
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4" />
            <span>Generate New API Key</span>
          </CardTitle>
          <CardDescription>
            Public keys can only subscribe contacts to a designated list; Secret keys allow full administrative API access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeyForm
            action={createKey}
            lists={lists.filter((l) => l.fromEmail).map((l) => ({ id: l.$id, name: l.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

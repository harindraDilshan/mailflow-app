import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, Link2, Plus, Terminal } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { countRecentSignups, listOwnedLists } from "@/lib/contacts";
import { listApiKeys } from "@/lib/api-keys";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const WAYS = [
  {
    icon: Link2,
    title: "Share a link",
    text: "A ready sign-up page on Mailflow. Put the link in your social profiles, emails, or on a QR code. No website needed.",
  },
  {
    icon: Code2,
    title: "Embed on your website",
    text: "Copy a small piece of HTML into WordPress, Webflow, Wix, or any website. It looks like your own form.",
  },
  {
    icon: Terminal,
    title: "Connect with the API",
    text: "For developers: add people from your own server, for example at checkout or when they create an account.",
  },
];

export default function FormsPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign-up forms</h1>
        <p className="text-xs text-muted-foreground">
          Let people join your lists by themselves. Each list has its own form. New subscribers confirm by email first.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {WAYS.map((w) => (
          <Card key={w.title} size="sm">
            <CardContent className="space-y-1.5">
              <w.icon className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">{w.title}</p>
              <p className="text-xs text-muted-foreground">{w.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <FormsTable />
      </Suspense>
    </div>
  );
}

async function FormsTable() {
  const user = await requireUser();
  const [lists, keys] = await Promise.all([listOwnedLists(user.$id), listApiKeys(user.$id)]);
  const formKeyFor = new Set(keys.filter((k) => k.type === "public" && k.status === "active").map((k) => k.listId));
  const signups = await Promise.all(lists.map((l) => countRecentSignups(user.$id, l.$id).catch(() => 0)));

  if (lists.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium">Create a list first</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            A sign-up form adds people to a list, like &ldquo;Newsletter&rdquo; or &ldquo;Product updates&rdquo;.
          </p>
          <Button size="sm" render={<Link href="/contacts/lists" />}>
            <Plus />
            Create a list
          </Button>
        </CardContent>
      </Card>
    );
  }

  const yes = (text: string) => (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-3.5" />
      {text}
    </span>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs">List</TableHead>
            <TableHead className="hidden text-xs sm:table-cell">Confirmation email</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Link</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Website form</TableHead>
            <TableHead className="text-right text-xs">Sign-ups, 30 days</TableHead>
            <TableHead className="w-28 pr-4">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lists.map((l, i) => {
            const ready = Boolean(l.fromEmail);
            return (
              <TableRow key={l.$id}>
                <TableCell className="max-w-56 truncate pl-4 text-sm font-medium">{l.name}</TableCell>
                <TableCell className="hidden text-xs sm:table-cell">
                  {ready ? yes("Ready") : <Badge variant="outline" className="font-normal">Set it first</Badge>}
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">
                  {l.hostedEnabled && ready ? yes("Live") : <span className="text-muted-foreground">Off</span>}
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">
                  {formKeyFor.has(l.$id) ? yes("Ready") : <span className="text-muted-foreground">Not set up</span>}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatNumber(signups[i])}</TableCell>
                <TableCell className="pr-4 text-right">
                  <Button size="xs" variant={ready ? "outline" : "default"} render={<Link href={`/contacts/lists/${l.$id}/collect`} />}>
                    {ready ? "Open" : "Set up"}
                    <ArrowRight />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ListFilter } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { countContactsInList, listOwnedLists } from "@/lib/contacts";
import { MAX_LISTS } from "@/lib/contact-rules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListsTable, type ListSummary } from "./lists-table";
import { NewListButton } from "./list-dialog";

export default function ListsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts" />}>
          <ArrowLeft />
          Contacts
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Lists</h1>
            <p className="text-xs text-muted-foreground">
              Group contacts by topic or product. Send campaigns to a list, or start an automation when someone joins it.
            </p>
          </div>
          <NewListButton />
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <ListsContent />
      </Suspense>
    </div>
  );
}

async function ListsContent() {
  const user = await requireUser();
  const lists = await listOwnedLists(user.$id);

  const summaries: ListSummary[] = await Promise.all(
    lists.map(async (l) => {
      const [active, total] = await Promise.all([
        countContactsInList(user.$id, l.$id, "active"),
        countContactsInList(user.$id, l.$id),
      ]);
      return {
        id: l.$id,
        name: l.name,
        createdAt: l.$createdAt,
        active,
        total,
        signupOn: Boolean(l.hostedEnabled && l.fromEmail),
      };
    })
  );

  if (summaries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
            <ListFilter className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-medium">No lists yet</h2>
            <p className="max-w-sm text-xs text-muted-foreground">
              Create your first list, for example &ldquo;Weekly newsletter&rdquo; or &ldquo;Product updates&rdquo;.
            </p>
          </div>
          <NewListButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <ListsTable lists={summaries} />
      <p className="text-[11px] text-muted-foreground">
        {summaries.length} of {MAX_LISTS} lists. &ldquo;Active&rdquo; contacts get your campaigns.
        &ldquo;All contacts&rdquo; also counts pending, unsubscribed, and bounced contacts.
      </p>
    </div>
  );
}

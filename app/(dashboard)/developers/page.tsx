import { Suspense } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { listApiKeys } from "@/lib/api-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KeysView, type KeyItem } from "./keys-view";

export default function DevelopersPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">API keys</h1>
          <p className="text-xs text-muted-foreground">
            Connect your website, shop, or app to Mailflow and add subscribers from your own code
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/docs/api" />}>
          <BookOpen />
          API docs
        </Button>
      </div>
      <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-xl" />}>
        <KeysContent />
      </Suspense>
    </div>
  );
}

async function KeysContent() {
  const user = await requireUser();
  const [keys, lists] = await Promise.all([listApiKeys(user.$id), listOwnedLists(user.$id)]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  // Only what the screen needs: never the key hash, never the full key.
  const items: KeyItem[] = keys.map((k) => ({
    id: k.$id,
    name: k.name,
    type: k.type,
    prefix: k.prefix,
    createdAt: k.$createdAt,
    lastUsedAt: k.lastUsedAt,
    status: k.status,
    listId: k.listId,
    listName: k.listId ? (listName.get(k.listId) ?? null) : null,
    origins: k.allowedOrigins ?? [],
  }));

  return (
    <KeysView
      keys={items}
      lists={lists.map((l) => ({ id: l.$id, name: l.name }))}
      base={(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}
    />
  );
}

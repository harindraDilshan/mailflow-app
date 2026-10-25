import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
import { countContactsInList, listOwnedLists } from "@/lib/contacts";
import { createList, deleteList } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ListFilter, Plus, Globe } from "lucide-react";

export default async function ListsPage() {
  const user = await requireUser();
  const lists = await listOwnedLists(user.$id);
  const counts = await Promise.all(lists.map((l) => countContactsInList(user.$id, l.$id)));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Subscriber Lists
          </h1>
          <p className="text-xs text-muted-foreground">
            Organize and segment contacts for targeted email broadcasts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="size-4" />
            <span>All Lists</span>
          </CardTitle>
          <CardDescription>
            Lists created to segment your audience and trigger automations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {lists.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No subscriber lists created yet. Create a list below to begin organizing contacts.
              </p>
            )}
            {lists.map((l, i) => (
              <div key={l.$id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <Link
                    href={`/contacts?list=${l.$id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {l.name}
                  </Link>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                    ({counts[i]} contacts)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    render={<Link href={`/contacts/lists/${l.$id}/collect`} />}
                  >
                    <Globe className="size-3" />
                    <span>Hosted Form</span>
                  </Button>
                  <form action={deleteList}>
                    <input type="hidden" name="id" value={l.$id} />
                    <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>Create a Subscriber List</span>
          </CardTitle>
          <CardDescription>
            Give your list a name such as "Weekly Newsletter" or "Product Announcements"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={createList}
            submitLabel="Create List"
            fields={[{ name: "name", label: "List name", placeholder: "e.g. Early Access VIPs" }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { listAutomations } from "@/lib/automations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Sparkles } from "lucide-react";

export default async function AutomationsPage() {
  const user = await requireUser();
  const [automations, lists] = await Promise.all([listAutomations(user.$id), listOwnedLists(user.$id)]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Automations
          </h1>
          <p className="text-xs text-muted-foreground">
            Automated email sequences triggered by subscriber actions and tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/automations/new?template=welcome" />}>
            <Sparkles className="size-3.5" />
            <span>Welcome Template</span>
          </Button>
          <Button size="sm" render={<Link href="/automations/new" />}>
            <Plus className="size-3.5" />
            <span>New Automation</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sequences</CardTitle>
          <CardDescription>
            Workflows that send automated emails when subscribers join a list or receive tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {automations.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No automations configured yet. Start with the Welcome Template or create a custom flow.
              </p>
            )}
            {automations.map((a) => (
              <div key={a.$id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <Link
                    href={`/automations/${a.$id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {a.triggerType === "list_joined"
                      ? `Trigger: Joins "${listName.get(a.triggerValue) ?? "—"}"`
                      : `Trigger: Tagged with "${a.triggerValue}"`}
                  </p>
                </div>
                <Badge variant={a.status === "active" ? "default" : "outline"} className="text-[10px]">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

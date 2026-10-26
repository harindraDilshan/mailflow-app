import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { AUTOMATION_RECIPES } from "@/lib/automation-templates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewAutomationForm } from "./new-automation-form";

export default function NewAutomationPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/automations" />}>
          <ArrowLeft />
          Automations
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">New automation</h1>
          <p className="text-xs text-muted-foreground">
            Choose a starting point and a trigger. Then build the workflow on the canvas.
          </p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewContent({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));
  const initial = AUTOMATION_RECIPES.some((r) => r.id === template) ? template! : AUTOMATION_RECIPES[0].id;

  return <NewAutomationForm lists={lists} recipes={AUTOMATION_RECIPES} initialRecipe={initial} />;
}

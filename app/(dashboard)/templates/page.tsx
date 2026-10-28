import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listOwnedTemplates } from "@/lib/templates";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTemplateMenu, TemplatesView } from "./templates-view";

type SP = Record<string, string | string[] | undefined>;

export default function TemplatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Templates</h1>
          <p className="text-xs text-muted-foreground">
            Ready designs for your campaigns and automations. Change them in the visual editor, or write your own HTML.
          </p>
        </div>
        <NewTemplateMenu />
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          </div>
        }
      >
        <TemplatesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TemplatesContent({ searchParams }: { searchParams: Promise<SP> }) {
  const tab = (await searchParams).tab === "mine" ? "mine" : "gallery";
  const user = await requireUser();
  const { templates, setupNeeded } = await listOwnedTemplates(user.$id);
  return <TemplatesView initialTab={tab} saved={templates} setupNeeded={setupNeeded} />;
}

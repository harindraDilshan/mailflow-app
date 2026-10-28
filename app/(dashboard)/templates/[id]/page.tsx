import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedTemplate, toSavedTemplate } from "@/lib/templates";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateEditor } from "./template-editor";

export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy aria-label="Loading template">
          <Skeleton className="h-9 w-72" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-[640px] rounded-xl" />
            <Skeleton className="h-[640px] rounded-xl" />
          </div>
        </div>
      }
    >
      <TemplateContent params={params} />
    </Suspense>
  );
}

async function TemplateContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const row = await getOwnedTemplate(user.$id, id);
  if (!row) notFound();
  return <TemplateEditor key={row.$id} template={toSavedTemplate(row)} />;
}

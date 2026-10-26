import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOwnedCampaign } from "@/lib/campaigns";
import { canEditCampaign } from "@/lib/campaign-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignEditor } from "../../campaign-editor";
import { loadEditorData } from "../../editor-data";

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6 xl:grid-cols-2" aria-busy aria-label="Loading campaign">
          <Skeleton className="h-[640px] rounded-xl" />
          <Skeleton className="h-[640px] rounded-xl" />
        </div>
      }
    >
      <EditContent params={params} />
    </Suspense>
  );
}

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();
  // Scheduled and sent campaigns are not edited here. Their page explains what to do.
  if (!canEditCampaign(c.status)) redirect(`/campaigns/${c.$id}`);

  const data = await loadEditorData(user.$id);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href={`/campaigns/${c.$id}`} />}>
          <ArrowLeft />
          Review
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Edit campaign</h1>
          <p className="text-xs text-muted-foreground">{c.name}</p>
        </div>
      </div>

      <CampaignEditor
        campaign={{
          id: c.$id,
          name: c.name,
          subject: c.subject,
          previewText: c.previewText ?? "",
          fromName: c.fromName ?? "",
          fromEmail: c.fromEmail,
          replyTo: c.replyTo ?? "",
          html: c.html,
          listIds: c.listIds ?? [],
        }}
        {...data}
      />
    </div>
  );
}

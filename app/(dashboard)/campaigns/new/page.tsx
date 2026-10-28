import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { lastSender } from "@/lib/campaigns";
import { renderDesign } from "@/lib/email-design";
import { getGalleryTemplate } from "@/lib/template-gallery";
import { getOwnedTemplate, toSavedTemplate } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { CampaignEditor } from "../campaign-editor";
import { loadEditorData } from "../editor-data";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

// "Use in campaign" from the templates: ?gallery=<id> (built-in) or ?template=<id> (saved).
async function startingContent(accountId: string, sp: SP) {
  const gallery = one(sp.gallery);
  const t = gallery ? getGalleryTemplate(gallery) : null;
  if (t) return { key: `gallery:${t.id}`, name: t.name, subject: t.subject, previewText: t.previewText, design: t.design, html: renderDesign(t.design) };

  const id = one(sp.template);
  const row = id ? await getOwnedTemplate(accountId, id) : null;
  if (row) {
    const saved = toSavedTemplate(row);
    return { key: `template:${saved.id}`, name: saved.name, subject: "", previewText: "", design: saved.design, html: saved.html };
  }
  return null;
}

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const [data, sender, start] = await Promise.all([
    loadEditorData(user.$id),
    lastSender(user.$id),
    searchParams.then((sp) => startingContent(user.$id, sp)),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href={start ? "/templates" : "/campaigns"} />}>
          <ArrowLeft />
          {start ? "Templates" : "Campaigns"}
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">New campaign</h1>
          <p className="text-xs text-muted-foreground">
            {start
              ? `This campaign starts from the template "${start.name}". Your changes do not change the template.`
              : "Write your email and save it as a draft. You can send a test, schedule it, or send it after the review."}
          </p>
        </div>
      </div>

      {/* A new key for each template: the editor starts again with its content. */}
      <CampaignEditor
        key={start?.key ?? "blank"}
        campaign={{
          id: "",
          name: start?.name ?? "",
          subject: start?.subject ?? "",
          previewText: start?.previewText ?? "",
          // The sender of the last campaign: most people always send from the same address.
          fromName: sender.fromName,
          fromEmail: sender.fromEmail,
          replyTo: sender.replyTo,
          html: start?.html ?? "",
          design: start?.design ?? null,
          listIds: [],
        }}
        {...data}
      />
    </div>
  );
}

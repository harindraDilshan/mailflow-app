import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { lastSender } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { CampaignEditor } from "../campaign-editor";
import { loadEditorData } from "../editor-data";

export default async function NewCampaignPage() {
  const user = await requireUser();
  const [data, sender] = await Promise.all([loadEditorData(user.$id), lastSender(user.$id)]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/campaigns" />}>
          <ArrowLeft />
          Campaigns
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">New campaign</h1>
          <p className="text-xs text-muted-foreground">
            Write your email and save it as a draft. You can send a test, schedule it, or send it after the review.
          </p>
        </div>
      </div>

      <CampaignEditor
        campaign={{
          id: "",
          name: "",
          subject: "",
          previewText: "",
          // The sender of the last campaign: most people always send from the same address.
          fromName: sender.fromName,
          fromEmail: sender.fromEmail,
          replyTo: sender.replyTo,
          html: "",
          listIds: [],
        }}
        {...data}
      />
    </div>
  );
}

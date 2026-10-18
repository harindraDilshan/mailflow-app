import { CampaignForm } from "@/components/campaign-form";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { createCampaign } from "../actions";

export default async function NewCampaignPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">New campaign</h1>
      <CampaignForm action={createCampaign} lists={lists} />
    </div>
  );
}
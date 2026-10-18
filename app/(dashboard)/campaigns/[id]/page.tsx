import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { requireUser } from "@/lib/auth";
import { countMessages, getOwnedCampaign, reviewCampaign } from "@/lib/campaigns";
import { sendCampaign } from "../actions";

const LABEL: Record<string, string> = {
  draft: "Draft", queued: "Preparing", sending: "Sending", sent: "Done", failed: "Failed",
};

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getOwnedCampaign(user.$id, id);
  if (!c) notFound();

  const isDraft = c.status === "draft";
  const review = isDraft ? await reviewCampaign(user.$id, c) : null;
  const issues = [...(review?.issues ?? [])];
  if (isDraft && !user.emailVerification) issues.push("Verify your email first.");

  const [queued, sent, failed] = isDraft
    ? [0, 0, 0]
    : await Promise.all([countMessages(c.$id, "queued"), countMessages(c.$id, "sent"), countMessages(c.$id, "failed")]);
  const total = queued + sent + failed;
  const done = sent + failed;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-2xl">
      <AutoRefresh active={c.status === "queued" || c.status === "sending"} />
      <h1 className="text-2xl font-semibold">{c.name}</h1>
      <p className="mb-6 text-sm text-gray-600">
        Status: <b>{LABEL[c.status] ?? c.status}</b> · Subject: {c.subject} · From: {c.fromEmail}
      </p>

      {isDraft && (
        <div className="rounded border p-4">
          <p className="mb-2 text-sm">Audience: <b>{review?.audience ?? 0}</b> people</p>
          {issues.length > 0 ? (
            <ul className="mb-3 list-disc pl-5 text-sm text-red-600">
              {issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-green-700">Everything looks good.</p>
          )}
          <form action={sendCampaign}>
            <input type="hidden" name="id" value={c.$id} />
            <button disabled={issues.length > 0} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
              Send now
            </button>
          </form>
        </div>
      )}

      {!isDraft && (
        <div className="rounded border p-4 text-sm">
          <div className="mb-3 h-3 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-3 bg-black" style={{ width: `${percent}%` }} />
          </div>
          <p>Total: <b>{total}</b></p>
          <p>Sent: <b>{sent}</b></p>
          <p>Waiting: <b>{queued}</b></p>
          <p>Failed: <b>{failed}</b></p>
          {c.status === "queued" && <p className="mt-2 text-gray-500">Preparing the list of recipients...</p>}
        </div>
      )}
    </div>
  );
}
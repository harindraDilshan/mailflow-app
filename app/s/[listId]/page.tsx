import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getList } from "@/lib/subscribe";
import { HostedForm } from "./hosted-form";

export const metadata = { robots: "noindex" };

export default function HostedPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <main className="mx-auto mt-20 max-w-md p-6">
      <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
        <HostedContent params={params} />
      </Suspense>
    </main>
  );
}

async function HostedContent({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list || !list.hostedEnabled || !list.fromEmail) notFound();

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{list.pageTitle || list.name}</h1>
      {list.pageText && <p className="mb-6 text-sm text-gray-600">{list.pageText}</p>}
      <HostedForm listId={list.$id} />
    </>
  );
}
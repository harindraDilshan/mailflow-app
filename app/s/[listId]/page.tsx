import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getList } from "@/lib/subscribe";
import { designOf } from "@/lib/forms";
import { SignupForm } from "@/components/forms/signup-card";

export const metadata = { robots: "noindex" };

// The hosted sign-up page of a list. Light on purpose: it shows the customer's own colors.
export default function HostedPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <Suspense fallback={<div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
        <HostedContent params={params} />
      </Suspense>
    </main>
  );
}

async function HostedContent({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list || !list.hostedEnabled || !list.fromEmail) notFound();

  return <SignupForm listId={list.$id} design={designOf(list)} />;
}

import { Suspense } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { getList } from "@/lib/subscribe";
import { designOf, iconColorOn, DEFAULT_SUCCESS } from "@/lib/forms";

export const metadata = { robots: "noindex" };

// The page after an embedded form posts without JavaScript (the API redirects here).
const ERRORS: Record<string, string> = {
  invalid_email: "That email address does not look right. Go back and try again.",
  contact_limit_reached: "Sign-ups are closed right now.",
  list_not_found: "This sign-up form is not available.",
  list_not_configured: "This sign-up form is not ready yet.",
};

export default function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <Suspense fallback={<div className="h-48 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
        <ThanksContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ThanksContent({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ listId }, { error }] = await Promise.all([params, searchParams]);
  const list = await getList(listId).catch(() => null);
  const design = list ? designOf(list) : null;

  return (
    <div className="w-full max-w-sm space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      {error ? (
        <>
          <XCircle className="mx-auto size-8 text-red-500" />
          <p className="text-sm text-zinc-700">{ERRORS[error] ?? "Something went wrong. Please try again."}</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto size-8" style={{ color: iconColorOn(design?.color) }} />
          <h1 className="text-lg font-semibold text-zinc-900">Almost done</h1>
          <p className="text-sm text-zinc-600">{design?.success ?? DEFAULT_SUCCESS}</p>
        </>
      )}
    </div>
  );
}

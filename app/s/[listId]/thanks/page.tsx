import { Suspense } from "react";

export const metadata = { robots: "noindex" };

const ERRORS: Record<string, string> = {
  invalid_email: "That email address does not look right. Please go back and try again.",
  contact_limit_reached: "Sign-ups are closed right now.",
};

export default function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto mt-24 max-w-md p-6 text-center text-xs text-muted-foreground">
          Loading...
        </main>
      }
    >
      <ThanksContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ThanksContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      {error ? (
        <p className="text-sm text-destructive">{ERRORS[error] ?? "Something went wrong. Please try again."}</p>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            Click the link we sent you to confirm your subscription.
          </p>
        </>
      )}
    </main>
  );
}

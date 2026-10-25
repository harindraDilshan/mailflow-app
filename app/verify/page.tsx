import { Suspense } from "react";
import Link from "next/link";
import { createSessionClient } from "@/lib/appwrite/server";
import { Button } from "@/components/ui/button";

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto mt-20 max-w-sm p-4 text-xs text-muted-foreground">
          Verifying your email...
        </main>
      }
    >
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyContent({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId, secret } = await searchParams;
  let ok = false;

  if (userId && secret) {
    try {
      const { account } = await createSessionClient();
      await account.updateVerification({ userId, secret });
      ok = true;
    } catch {}
  }

  return (
    <main className="mx-auto mt-20 max-w-sm p-4">
      <p className="mb-4 text-sm text-foreground">
        {ok
          ? "Your email is verified."
          : "Could not verify. Log in first, then open the link again, or ask for a new email from the dashboard."}
      </p>
      <Button variant="outline" size="sm" render={<Link href="/dashboard" />}>
        Go to dashboard
      </Button>
    </main>
  );
}

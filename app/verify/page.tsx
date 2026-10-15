import Link from "next/link";
import { createSessionClient } from "@/lib/appwrite/server";

export default async function VerifyPage({
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
      <p className="mb-4">
        {ok
          ? "Your email is verified."
          : "Could not verify. Log in first, then open the link again, or ask for a new email from the dashboard."}
      </p>
      <Link href="/dashboard" className="underline">Go to dashboard</Link>
    </main>
  );
}
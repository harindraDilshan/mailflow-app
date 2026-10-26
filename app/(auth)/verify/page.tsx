import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createPublicClient } from "@/lib/appwrite/server";
import { getLoggedInUser } from "@/lib/auth";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SP = Promise<{ userId?: string; secret?: string }>;

// The page of the link in the "verify your email" email.
export default function VerifyPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyContent({ searchParams }: { searchParams: SP }) {
  const { userId, secret } = await searchParams;

  // No session needed: people often open the link on another device or in another browser.
  let ok = false;
  if (userId && secret) {
    ok = await createPublicClient()
      .account.updateEmailVerification({ userId, secret })
      .then(() => true)
      .catch(() => false);
  }
  const user = await getLoggedInUser().catch(() => null);

  if (ok || user?.emailVerification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Your email is verified
          </CardTitle>
          <CardDescription>You can now send campaigns and turn on automations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href={user ? "/dashboard" : "/login"} />}>
            {user ? "Go to the dashboard" : "Log in"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="size-4 text-destructive" />
          This link does not work
        </CardTitle>
        <CardDescription>The link is too old, was used already, or is not complete.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {user ? (
          <>
            <p className="text-xs text-muted-foreground">We can send a new link to {user.email}.</p>
            <ResendVerificationButton size="sm" />
          </>
        ) : (
          <Button className="w-full" render={<Link href="/login?next=/settings" />}>
            Log in to get a new link
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

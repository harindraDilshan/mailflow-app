import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "../auth-forms";

type SP = Promise<{ userId?: string; secret?: string }>;

export default function ResetPasswordPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: { searchParams: SP }) {
  const { userId, secret } = await searchParams;

  if (!userId || !secret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This link does not work</CardTitle>
          <CardDescription>The link is not complete, or it is too old. A reset link works for 1 hour, one time.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href="/forgot-password" />}>
            Ask for a new link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use a password that you do not use on other websites.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm userId={userId} secret={secret} />
      </CardContent>
    </Card>
  );
}

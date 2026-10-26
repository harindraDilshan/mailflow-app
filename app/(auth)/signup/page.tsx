import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignupForm } from "../auth-forms";

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start sending campaigns and automations in a few minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <SignUpContent />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center text-xs text-muted-foreground">
        Already have an account?&nbsp;
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </CardFooter>
    </Card>
  );
}

async function SignUpContent() {
  const state = await getSessionState().catch(() => null);
  if (state?.status === "signed-in") redirect("/dashboard");
  return <SignupForm />;
}

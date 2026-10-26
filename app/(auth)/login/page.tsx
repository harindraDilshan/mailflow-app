import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth";
import { safeNext } from "@/lib/auth-rules";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "../auth-forms";

type SP = Promise<{ next?: string; reason?: string }>;

// Why the user is on the log-in page (set by redirects).
const NOTICES: Record<string, { tone: "info" | "success"; text: string }> = {
  expired: { tone: "info", text: "Your session ended. Log in again to continue." },
  "signed-out": { tone: "success", text: "You are logged out." },
  "password-reset": {
    tone: "success",
    text: "Your password is changed, and all devices are logged out. Log in with the new password.",
  },
};

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to Mailflow</CardTitle>
        <CardDescription>Welcome back. Enter your email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center text-xs text-muted-foreground">
        New to Mailflow?&nbsp;
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </CardFooter>
    </Card>
  );
}

async function LoginContent({ searchParams }: { searchParams: SP }) {
  const { next: rawNext, reason } = await searchParams;
  const next = safeNext(rawNext);

  // Already logged in: go on. Password done but not the code: the code page.
  const state = await getSessionState().catch(() => null);
  if (state?.status === "signed-in") redirect(next);
  if (state?.status === "second-factor") redirect(`/login/verify?next=${encodeURIComponent(next)}`);

  return <LoginForm next={next} notice={reason ? NOTICES[reason] : undefined} />;
}

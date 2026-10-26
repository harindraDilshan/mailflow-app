import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createSessionClient } from "@/lib/appwrite/server";
import { getSessionState } from "@/lib/auth";
import { safeNext } from "@/lib/auth-rules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SecondFactorForm } from "./second-factor-form";

type SP = Promise<{ next?: string }>;

// The second step of the log-in, for accounts with 2-step verification.
export default function SecondFactorPage({ searchParams }: { searchParams: SP }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          2-step verification
        </CardTitle>
        <CardDescription>Your password is correct. Now confirm that it is you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <SecondFactorContent searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function SecondFactorContent({ searchParams }: { searchParams: SP }) {
  const next = safeNext((await searchParams).next);
  const state = await getSessionState();
  if (state.status === "signed-in") redirect(next);
  if (state.status === "signed-out") redirect("/login?reason=expired");

  // Which second steps this account can use.
  const { account } = await createSessionClient();
  const factors = await account.listMFAFactors().catch(() => ({ totp: true, email: false, recoveryCode: true }));

  return <SecondFactorForm factors={{ totp: factors.totp, email: factors.email, recoveryCode: factors.recoveryCode }} next={next} />;
}

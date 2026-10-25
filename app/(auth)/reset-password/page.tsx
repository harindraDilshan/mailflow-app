import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { resetPassword } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Choose New Password</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId, secret } = await searchParams;
  if (!userId || !secret) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            This password recovery link is invalid or has expired.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose New Password</CardTitle>
        <CardDescription>Enter a strong password of at least 8 characters</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={resetPassword}
          submitLabel="Save New Password"
          hidden={{ userId, secret }}
          fields={[{ name: "password", label: "New Password", type: "password" }]}
        />
      </CardContent>
    </Card>
  );
}

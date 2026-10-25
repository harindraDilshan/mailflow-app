import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getLoggedInUser } from "@/lib/auth";
import { signIn } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Log in to Mailflow</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  if (await getLoggedInUser()) redirect("/dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to Mailflow</CardTitle>
        <CardDescription>Enter your credentials to access your email platform</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={signIn}
          submitLabel="Log In"
          fields={[
            { name: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
            { name: "password", label: "Password", type: "password" },
          ]}
        />
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="hover:underline">
          Create account
        </Link>
      </CardFooter>
    </Card>
  );
}

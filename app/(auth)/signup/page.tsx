import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getLoggedInUser } from "@/lib/auth";
import { signUp } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Create your Account</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

async function SignUpContent() {
  if (await getLoggedInUser()) redirect("/dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your Account</CardTitle>
        <CardDescription>Get started with your self-hosted email marketing platform</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={signUp}
          submitLabel="Create Account"
          fields={[
            { name: "name", label: "Full Name", placeholder: "Alex Smith" },
            { name: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
            { name: "password", label: "Password (8+ chars)", type: "password" },
          ]}
        />
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground">
        <Link href="/login" className="hover:underline">
          Already have an account? Log in
        </Link>
      </CardFooter>
    </Card>
  );
}

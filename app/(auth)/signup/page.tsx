import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getLoggedInUser } from "@/lib/auth";
import { signUp } from "../actions";

export default async function SignUpPage() {
  if (await getLoggedInUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Create account</h1>
      <AuthForm
        action={signUp}
        submitLabel="Sign up"
        fields={[
          { name: "name", label: "Name" },
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password", type: "password" },
        ]}
      />
      <p className="mt-4 text-sm">
        Have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </>
  );
}
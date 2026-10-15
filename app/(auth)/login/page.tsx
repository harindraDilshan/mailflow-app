import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getLoggedInUser } from "@/lib/auth";
import { signIn } from "../actions";

export default async function LoginPage() {
  if (await getLoggedInUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <AuthForm
        action={signIn}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password", type: "password" },
        ]}
      />
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="underline">Forgot password?</Link>
        {" · "}
        <Link href="/signup" className="underline">Create account</Link>
      </p>
    </>
  );
}
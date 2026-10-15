import { AuthForm } from "@/components/auth-form";
import { resetPassword } from "../actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId, secret } = await searchParams;
  if (!userId || !secret) return <p>This link is not valid.</p>;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Choose a new password</h1>
      <AuthForm
        action={resetPassword}
        submitLabel="Save password"
        hidden={{ userId, secret }}
        fields={[{ name: "password", label: "New password", type: "password" }]}
      />
    </>
  );
}
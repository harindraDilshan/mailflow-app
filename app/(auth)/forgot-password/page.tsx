import { AuthForm } from "@/components/auth-form";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Reset your password</h1>
      <AuthForm
        action={forgotPassword}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email" }]}
      />
    </>
  );
}
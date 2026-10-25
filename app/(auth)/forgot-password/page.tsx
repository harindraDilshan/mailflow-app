import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { forgotPassword } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email to receive account recovery instructions</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={forgotPassword}
          submitLabel="Send Reset Link"
          fields={[{ name: "email", label: "Email Address", type: "email", placeholder: "you@example.com" }]}
        />
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground">
        <Link href="/login" className="hover:underline">
          Return to log in
        </Link>
      </CardFooter>
    </Card>
  );
}

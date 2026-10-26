import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "../auth-forms";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter the email of your account. We send you a link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="justify-center text-xs">
        <Link href="/login" className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3" />
          Back to log in
        </Link>
      </CardFooter>
    </Card>
  );
}

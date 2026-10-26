"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { FormMessage } from "@/components/auth/form-message";
import { useActionForm } from "@/hooks/use-action-form";
import { forgotPassword, resetPassword, signIn, signUp, type AuthState } from "./actions";

const label = "text-xs font-medium text-foreground";

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

// ---------- log in ----------
export function LoginForm({ next, notice }: { next: string; notice?: { tone: "info" | "success"; text: string } }) {
  const { state, pending, onSubmit } = useActionForm<AuthState>(signIn, undefined);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {notice && !state?.error && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}

      <div className="space-y-1.5">
        <label htmlFor="email" className={label}>
          Email address
        </label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={label}>
            Password
          </label>
          <Link href="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
        <Checkbox name="remember" defaultChecked />
        Keep me logged in on this device
      </label>

      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Submit pending={pending}>Log in</Submit>
    </form>
  );
}

// ---------- sign up ----------
export function SignupForm() {
  const { state, pending, onSubmit } = useActionForm<AuthState>(signUp, undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className={label}>
          Full name
        </label>
        <Input id="name" name="name" autoComplete="name" required autoFocus maxLength={128} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className={label}>
          Work email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className={label}>
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-help"
        />
        <PasswordStrength id="password-help" password={password} email={email} name={name} />
      </div>

      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Submit pending={pending}>Create account</Submit>
      <p className="text-center text-[11px] text-muted-foreground">We send you an email to confirm your address.</p>
    </form>
  );
}

// ---------- forgotten password ----------
export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useActionForm<AuthState>(forgotPassword, undefined);

  if (state?.message) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <p className="text-xs text-muted-foreground">
          No email after a few minutes? Look in your spam folder, or check that you typed the address that you used to sign up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className={label}>
          Email address
        </label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="you@example.com" />
      </div>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  );
}

// ---------- new password from the emailed link ----------
export function ResetPasswordForm({ userId, secret }: { userId: string; secret: string }) {
  const { state, pending, onSubmit } = useActionForm<AuthState>(resetPassword, undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="secret" value={secret} />
      <div className="space-y-1.5">
        <label htmlFor="password" className={label}>
          New password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={8}
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-help"
        />
        <PasswordStrength id="password-help" password={password} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className={label}>
          Type the new password again
        </label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || undefined}
        />
        {mismatch && <p className="text-[11px] text-destructive">The two passwords are not the same.</p>}
      </div>

      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Submit pending={pending}>Save the new password</Submit>
      <p className="text-center text-[11px] text-muted-foreground">
        For your safety, this logs you out on all devices.
      </p>
    </form>
  );
}

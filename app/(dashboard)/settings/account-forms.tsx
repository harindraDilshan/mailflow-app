"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { FormMessage } from "@/components/auth/form-message";
import { useActionForm } from "@/hooks/use-action-form";
import { changePassword, updateEmail, updateName, type SettingsState } from "./actions";

const label = "text-xs font-medium text-foreground";

// Shows a toast on success; errors stay in the form, next to the fields.
function useSettingsForm(action: (s: SettingsState, fd: FormData) => Promise<SettingsState>, onDone?: () => void) {
  return useActionForm<SettingsState>(async (prev, fd) => {
    const res = await action(prev, fd);
    if (res?.message) {
      toast.success(res.message);
      onDone?.();
    }
    return res;
  }, undefined);
}

function Save({ pending, children = "Save" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function NameForm({ name }: { name: string }) {
  const { state, pending, onSubmit } = useSettingsForm(updateName);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="name" className={label}>
          Full name
        </label>
        <Input id="name" name="name" autoComplete="name" required maxLength={128} defaultValue={name} className="sm:w-80" />
      </div>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Save pending={pending} />
    </form>
  );
}

export function EmailForm() {
  const [key, setKey] = useState(0); // a fresh, empty form after a change
  const { state, pending, onSubmit } = useSettingsForm(updateEmail, () => setKey((k) => k + 1));
  return (
    <form key={key} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="new-email" className={label}>
            New email address
          </label>
          <Input id="new-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email-password" className={label}>
            Your password
          </label>
          <PasswordInput id="email-password" name="password" autoComplete="current-password" required />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">You log in with the new address. We send it a link to verify it.</p>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Save pending={pending}>Change email</Save>
    </form>
  );
}

export function PasswordForm({ email, name }: { email: string; name: string }) {
  const [key, setKey] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { state, pending, onSubmit } = useSettingsForm(changePassword, () => {
    setKey((k) => k + 1);
    setPassword("");
    setConfirm("");
  });
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form key={key} onSubmit={onSubmit} className="space-y-3">
      {/* For password managers: which account this password belongs to. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="space-y-1.5 sm:w-80">
        <label htmlFor="current" className={label}>
          Current password
        </label>
        <PasswordInput id="current" name="current" autoComplete="current-password" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className={label}>
            New password
          </label>
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="new-password-help"
          />
          <PasswordStrength id="new-password-help" password={password} email={email} name={name} />
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
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <Checkbox name="signOutOthers" defaultChecked />
        Log out of all other devices
      </label>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Save pending={pending}>Change password</Save>
    </form>
  );
}

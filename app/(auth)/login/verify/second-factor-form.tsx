"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormMessage } from "@/components/auth/form-message";
import { useActionForm } from "@/hooks/use-action-form";
import { sendEmailCode, signOut, verifySecondFactor, type SecondFactorState } from "../../actions";

type Method = "totp" | "email" | "recovery";

const HELP: Record<Method, string> = {
  totp: "Open your authenticator app (for example Google Authenticator, Microsoft Authenticator, or 1Password) and enter the 6-digit code for Mailflow.",
  email: "We send a 6-digit code to the email address of your account.",
  recovery: "Enter one of the recovery codes that you saved when you turned on 2-step verification. Each code works one time.",
};

export function SecondFactorForm({
  factors,
  next,
}: {
  factors: { totp: boolean; email: boolean; recoveryCode: boolean };
  next: string;
}) {
  const methods = (
    [factors.totp && "totp", factors.email && "email", factors.recoveryCode && "recovery"].filter(Boolean) as Method[]
  ).concat(factors.totp || factors.email || factors.recoveryCode ? [] : ["totp"]);
  const [method, setMethod] = useState<Method>(methods[0]);
  const [challengeId, setChallengeId] = useState("");
  const [emailNote, setEmailNote] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [sending, startSending] = useTransition();
  const { state, pending, onSubmit } = useActionForm<SecondFactorState>(verifySecondFactor, undefined);

  function sendCode() {
    startSending(async () => {
      const res = await sendEmailCode();
      if (res?.challengeId) setChallengeId(res.challengeId);
      setEmailNote(res?.error ? { tone: "error", text: res.error } : { tone: "success", text: res?.message ?? "" });
    });
  }

  const needsSend = method === "email" && !challengeId;

  return (
    <div className="space-y-4">
      {methods.length > 1 && (
        <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
          <TabsList className="w-full">
            {methods.includes("totp") && (
              <TabsTrigger value="totp" className="text-xs">
                <Smartphone />
                App
              </TabsTrigger>
            )}
            {methods.includes("email") && (
              <TabsTrigger value="email" className="text-xs">
                <Mail />
                Email
              </TabsTrigger>
            )}
            {methods.includes("recovery") && (
              <TabsTrigger value="recovery" className="text-xs">
                <KeyRound />
                Recovery code
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      <p className="text-xs text-muted-foreground">{HELP[method]}</p>

      {needsSend ? (
        <Button type="button" variant="outline" className="w-full" disabled={sending} onClick={sendCode}>
          {sending ? <Loader2 className="animate-spin" /> : <Mail />}
          Email me a code
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="challengeId" value={method === "email" ? challengeId : ""} />
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-xs font-medium">
              {method === "recovery" ? "Recovery code" : "6-digit code"}
            </label>
            <Input
              key={method}
              id="code"
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode={method === "recovery" ? "text" : "numeric"}
              pattern={method === "recovery" ? undefined : "[0-9 ]{6,7}"}
              maxLength={method === "recovery" ? 64 : 7}
              placeholder={method === "recovery" ? "" : "123456"}
              className="text-center font-mono text-lg tracking-[0.3em]"
            />
          </div>
          {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Verify and continue
          </Button>
          {method === "email" && (
            <button type="button" onClick={sendCode} disabled={sending} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground hover:underline">
              Send a new code
            </button>
          )}
        </form>
      )}

      {method === "email" && emailNote && <FormMessage tone={emailNote.tone}>{emailNote.text}</FormMessage>}

      <form action={signOut} className="border-t border-border pt-3 text-center">
        <button type="submit" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
          Log in with another account
        </button>
      </form>
    </div>
  );
}

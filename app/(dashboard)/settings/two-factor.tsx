"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Download, KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormMessage } from "@/components/auth/form-message";
import { CopyButton } from "@/components/copy-button";
import { useActionForm } from "@/hooks/use-action-form";
import {
  disableTwoFactor, finishTwoFactorSetup, regenerateRecoveryCodes, startTwoFactorSetup,
  type SettingsState, type TwoFactorState,
} from "./actions";

function CodeInput({ name = "code", recovery = false }: { name?: string; recovery?: boolean }) {
  return (
    <Input
      name={name}
      required
      autoFocus
      autoComplete="one-time-code"
      inputMode={recovery ? "text" : "numeric"}
      maxLength={recovery ? 64 : 7}
      placeholder={recovery ? "Recovery code" : "123456"}
      aria-label={recovery ? "Recovery code" : "6-digit code"}
      className="text-center font-mono text-lg tracking-[0.3em] sm:w-56"
    />
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Codes copied."))}
        >
          <Copy />
          Copy
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Mailflow recovery codes\n\n${text}\n`)}`}
          download="mailflow-recovery-codes.txt"
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted"
        >
          <Download className="size-3" />
          Download
        </a>
      </div>
    </div>
  );
}

// ---------- turn on ----------
function SetupDialog({
  setup,
  open,
  onClose,
}: {
  setup: { secret: string; qr: string } | null;
  open: boolean;
  onClose: (done: boolean) => void;
}) {
  const { state, pending, onSubmit } = useActionForm<TwoFactorState>(finishTwoFactorSetup, undefined);
  const [saved, setSaved] = useState(false);
  const done = Boolean(state?.done);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose(done)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? "Save your recovery codes" : "Turn on 2-step verification"}</DialogTitle>
          <DialogDescription>
            {done
              ? "If you lose your phone, a recovery code lets you log in. Keep them in a safe place, like a password manager."
              : "Use an authenticator app, like Google Authenticator, Microsoft Authenticator, 1Password, or Authy."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-3">
            {state?.recoveryCodes?.length ? (
              <RecoveryCodes codes={state.recoveryCodes} />
            ) : (
              <FormMessage tone="info">Your recovery codes from before still work.</FormMessage>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox checked={saved} onCheckedChange={(c) => setSaved(Boolean(c))} />
              I saved my recovery codes
            </label>
            <DialogFooter>
              <Button disabled={!saved && Boolean(state?.recoveryCodes?.length)} onClick={() => onClose(true)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="step" value={state?.needCode ? "enable" : "verify"} />
            {state?.needCode ? (
              <FormMessage tone="info">Your app works. To finish, wait for the next code and enter it.</FormMessage>
            ) : (
              setup && (
                <div className="space-y-3">
                  {setup.qr ? (
                    <>
                      <p className="text-xs">1. Scan this QR code with the app.</p>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a data URI from Appwrite, not a file to optimize */}
                      <img src={setup.qr} alt="QR code for your authenticator app" width={176} height={176} className="mx-auto rounded-md border border-border bg-white p-1" />
                    </>
                  ) : (
                    <p className="text-xs">1. In the app, choose &ldquo;Enter a setup key&rdquo;.</p>
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">{setup.qr ? "Cannot scan? Enter this key in the app:" : "Use this key, with the type “time-based”:"}</p>
                    <div className="flex items-center gap-2">
                      <code className="break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">{setup.secret}</code>
                      <CopyButton text={setup.secret} />
                    </div>
                  </div>
                  <p className="text-xs">2. Enter the 6-digit code that the app shows.</p>
                </div>
              )
            )}
            <CodeInput />
            {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Verify and turn on
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- turn off ----------
function DisableDialog({ open, onClose }: { open: boolean; onClose: (done: boolean) => void }) {
  const [method, setMethod] = useState<"totp" | "recovery">("totp");
  const { state, pending, onSubmit } = useActionForm<SettingsState>(async (prev, fd) => {
    const res = await disableTwoFactor(prev, fd);
    if (res?.message) {
      toast.success(res.message);
      onClose(true);
    }
    return res;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Turn off 2-step verification?</DialogTitle>
          <DialogDescription>Then a password alone opens your account. Confirm with a code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="method" value={method} />
          <Tabs value={method} onValueChange={(v) => setMethod(v === "recovery" ? "recovery" : "totp")}>
            <TabsList className="w-full">
              <TabsTrigger value="totp" className="text-xs">
                <Smartphone />
                App code
              </TabsTrigger>
              <TabsTrigger value="recovery" className="text-xs">
                <KeyRound />
                Recovery code
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <CodeInput key={method} recovery={method === "recovery"} />
          {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <ShieldOff />}
              Turn off
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- new recovery codes ----------
function NewCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, pending, onSubmit } = useActionForm<TwoFactorState>(regenerateRecoveryCodes, undefined);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New recovery codes</DialogTitle>
          <DialogDescription>
            {state?.done ? state.message : "The new codes replace the old ones. Confirm with a code from your app."}
          </DialogDescription>
        </DialogHeader>
        {state?.done && state.recoveryCodes ? (
          <div className="space-y-3">
            <RecoveryCodes codes={state.recoveryCodes} />
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <CodeInput />
            {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Make new codes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- the card content ----------
export function TwoFactor({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"setup" | "disable" | "codes" | null>(null);
  const [dialogKey, setDialogKey] = useState(0); // every dialog opens fresh
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [starting, startStarting] = useTransition();

  function open(d: "setup" | "disable" | "codes") {
    setDialogKey((k) => k + 1);
    setDialog(d);
  }

  function beginSetup() {
    startStarting(async () => {
      const res = await startTwoFactorSetup();
      if (!res.ok || !res.secret) return void toast.error(res.message || "The setup could not start.");
      setSetup({ secret: res.secret, qr: res.qr ?? "" });
      open("setup");
    });
  }

  function close(changed: boolean) {
    setDialog(null);
    if (changed) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {enabled
            ? "When you log in, Mailflow asks for a code from your authenticator app after your password."
            : "Protect your account with a second step: a code from an app on your phone. A stolen password alone then cannot open your account."}
        </p>
        <Badge variant={enabled ? "secondary" : "outline"} className="shrink-0 gap-1.5 font-normal">
          <span className={enabled ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-zinc-400"} />
          {enabled ? "On" : "Off"}
        </Badge>
      </div>

      {enabled ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => open("codes")}>
            <KeyRound />
            New recovery codes
          </Button>
          <Button variant="destructive" size="sm" onClick={() => open("disable")}>
            <ShieldOff />
            Turn off
          </Button>
        </div>
      ) : (
        <Button size="sm" disabled={starting} onClick={beginSetup}>
          {starting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          Turn on 2-step verification
        </Button>
      )}

      <SetupDialog key={`s${dialogKey}`} setup={setup} open={dialog === "setup"} onClose={close} />
      <DisableDialog key={`d${dialogKey}`} open={dialog === "disable"} onClose={close} />
      <NewCodesDialog key={`c${dialogKey}`} open={dialog === "codes"} onClose={() => close(false)} />
    </div>
  );
}

"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { iconColorOn, textColorOn, type FormDesign } from "@/lib/forms";
import { hostedSubscribe } from "@/app/s/[listId]/actions";
import { cn } from "@/lib/utils";

type State = { error?: string; message?: string } | undefined;

function Fields({ design, disabled }: { design: FormDesign; disabled?: boolean }) {
  return (
    <>
      {design.nameField !== "off" && (
        <Input
          name="name"
          autoComplete="name"
          placeholder={design.nameField === "required" ? "Your name" : "Your name (optional)"}
          required={design.nameField === "required"}
          maxLength={200}
          disabled={disabled}
          aria-label="Your name"
          className="h-10 bg-white text-zinc-900 dark:bg-white"
        />
      )}
      <Input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Your email"
        required
        disabled={disabled}
        aria-label="Your email"
        className="h-10 bg-white text-zinc-900 dark:bg-white"
      />
    </>
  );
}

function Heading({ design }: { design: FormDesign }) {
  return (
    <div className="space-y-1.5 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{design.title}</h1>
      {design.text && <p className="text-sm whitespace-pre-line text-zinc-600">{design.text}</p>}
    </div>
  );
}

const button = (design: FormDesign) => ({ background: design.color, color: textColorOn(design.color) });
const CARD = "w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
const BUTTON = "flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-opacity disabled:opacity-60";

/** What the form looks like, in the designer. Nothing is sent. */
export function SignupPreview({ design, className }: { design: FormDesign; className?: string }) {
  return (
    <div className={cn(CARD, className)}>
      <Heading design={design} />
      <div className="space-y-2.5">
        <Fields design={design} disabled />
        <div className={BUTTON} style={button(design)}>
          {design.button}
        </div>
      </div>
      <p className="text-center text-[11px] text-zinc-500">We send you an email to confirm. You can unsubscribe at any time.</p>
    </div>
  );
}

/** The real form of the hosted page. */
export function SignupForm({ listId, design }: { listId: string; design: FormDesign }) {
  const { state, pending, onSubmit } = useActionForm<State>(hostedSubscribe, undefined);

  if (state?.message) {
    return (
      <div className={cn(CARD, "text-center")} role="status">
        <CheckCircle2 className="mx-auto size-8" style={{ color: iconColorOn(design.color) }} />
        <p className="text-sm text-zinc-700">{design.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={CARD}>
      <Heading design={design} />
      <input type="hidden" name="listId" value={listId} />
      <div className="space-y-2.5">
        <Fields design={design} />
        {/* A trap field for bots. People never see it. */}
        <input name="hp_field" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" />
        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={BUTTON} style={button(design)}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {design.button}
        </button>
      </div>
      <p className="text-center text-[11px] text-zinc-500">We send you an email to confirm. You can unsubscribe at any time.</p>
    </form>
  );
}

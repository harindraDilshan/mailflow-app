"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, Download, Loader2, Sparkles } from "lucide-react";
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
    <div className="space-y-2 text-center">
      {design.badgeText && (
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-800 uppercase dark:bg-amber-950/60 dark:text-amber-300">
            <Sparkles className="size-3" />
            {design.badgeText}
          </span>
        </div>
      )}
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{design.title}</h1>
      {design.text && <p className="text-sm whitespace-pre-line text-zinc-600">{design.text}</p>}
    </div>
  );
}

function IncentiveReward({ design }: { design: FormDesign }) {
  const [revealed, setRevealed] = useState(design.incentiveType !== "mystery_discount");
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (design.incentiveType === "discount_code" && design.incentiveValue) {
    return (
      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
        <p className="text-xs font-medium text-zinc-600">Your exclusive discount code:</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <code className="rounded-md border border-zinc-300 bg-white px-3 py-1 font-mono text-sm font-bold tracking-wider text-zinc-900">
            {design.incentiveValue}
          </code>
          <button
            type="button"
            onClick={() => copyCode(design.incentiveValue)}
            className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">Apply this code during your checkout.</p>
      </div>
    );
  }

  if (design.incentiveType === "lead_magnet" && design.incentiveValue) {
    return (
      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
        <p className="text-xs font-medium text-zinc-600">Your free resource is ready:</p>
        <a
          href={design.incentiveValue}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
        >
          <Download className="size-3.5" />
          Download Free Resource
        </a>
      </div>
    );
  }

  if (design.incentiveType === "mystery_discount" && design.incentiveValue) {
    if (!revealed) {
      return (
        <div className="mt-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4 text-center">
          <span className="text-2xl">🎁</span>
          <p className="mt-1 text-xs font-semibold text-amber-900">Mystery reward unlocked!</p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Sparkles className="size-3.5" />
            Click to Reveal Voucher
          </button>
        </div>
      );
    }
    return (
      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center">
        <p className="text-xs font-semibold text-amber-900">🎉 Congratulations! Your secret code:</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <code className="rounded-md border border-amber-300 bg-white px-3 py-1 font-mono text-sm font-bold tracking-wider text-amber-950">
            {design.incentiveValue}
          </code>
          <button
            type="button"
            onClick={() => copyCode(design.incentiveValue)}
            className="flex items-center gap-1 rounded-md bg-amber-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-amber-800"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-amber-800">Use this secret voucher at checkout.</p>
      </div>
    );
  }

  return null;
}

const button = (design: FormDesign) => ({ background: design.color, color: textColorOn(design.color) });
const CARD = "w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm";
const BUTTON = "flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-opacity disabled:opacity-60";

/** What the form looks like, in the designer. Nothing is sent. */
export function SignupPreview({ design, className }: { design: FormDesign; className?: string }) {
  const [viewReward, setViewReward] = useState(false);

  return (
    <div className="space-y-3">
      {design.incentiveType !== "standard" && (
        <div className="flex justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setViewReward(false)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition",
              !viewReward ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
            )}
          >
            Opt-in View
          </button>
          <button
            type="button"
            onClick={() => setViewReward(true)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition",
              viewReward ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
            )}
          >
            Success & Reward View
          </button>
        </div>
      )}

      {viewReward ? (
        <div className={cn(CARD, className, "text-center")}>
          <CheckCircle2 className="mx-auto size-8" style={{ color: iconColorOn(design.color) }} />
          <p className="text-sm font-medium text-zinc-800">{design.success}</p>
          <IncentiveReward design={design} />
        </div>
      ) : (
        <div className={cn(CARD, className)}>
          <Heading design={design} />
          <div className="space-y-2.5">
            <Fields design={design} disabled />
            <div className={BUTTON} style={button(design)}>
              {design.button}
            </div>
          </div>
          <p className="text-center text-[11px] text-zinc-500">
            We send you an email to confirm. You can unsubscribe at any time.
          </p>
        </div>
      )}
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
        <p className="text-sm font-medium text-zinc-800">{design.success}</p>
        <IncentiveReward design={design} />
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
      <p className="text-center text-[11px] text-zinc-500">
        We send you an email to confirm. You can unsubscribe at any time.
      </p>
    </form>
  );
}

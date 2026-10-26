"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export type CodeSample = { label: string; code: string };

// The chosen language is remembered, and every code box on the page follows it (like Stripe's docs).
const STORE = "mailflow-docs-language";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStored() {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null; // private mode or blocked storage: use the first language
  }
}

function store(label: string) {
  try {
    localStorage.setItem(STORE, label);
  } catch {}
  listeners.forEach((l) => l());
}

export function CodeTabs({ samples, title, className }: { samples: CodeSample[]; title?: string; className?: string }) {
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const [own, setOwn] = useState<string | null>(null);
  const active = samples.find((s) => s.label === (own ?? stored)) ?? samples[0];
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-muted/40", className)}>
      <div className="flex items-center gap-1 border-b border-border/60 bg-muted/80 px-2 py-1">
        {title && <span className="mr-2 text-[11px] font-medium text-muted-foreground">{title}</span>}
        <div role="tablist" aria-label="Language" className="flex flex-wrap gap-0.5">
          {samples.map((s) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={s.label === active.label}
              onClick={() => {
                setOwn(s.label);
                store(s.label);
              }}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                s.label === active.label ? "bg-background font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Copy code"
          onClick={() =>
            navigator.clipboard.writeText(active.code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
          className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre role="tabpanel" className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
        <code>{active.code}</code>
      </pre>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange"> & {
  value: string; // the value in the URL
  onCommit: (value: string) => void;
  delay?: number;
  icon?: ReactNode;
  clearable?: boolean;
};

/**
 * A filter field that applies itself after the user stops typing (or presses Enter).
 * Escape or the X button clears it.
 */
export function DebouncedInput({ value, onCommit, delay = 400, icon, clearable, className, ...props }: Props) {
  const [text, setText] = useState(value);
  const [sent, setSent] = useState(value);
  // The URL changed from outside (back button, "Clear filters"): show the new value.
  if (value !== sent) {
    setSent(value);
    setText(value);
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const t = timer;
    return () => clearTimeout(t.current); // never apply a filter after the user left the page
  }, []);

  function commit(next: string) {
    clearTimeout(timer.current);
    const clean = next.trim();
    if (clean === sent) return;
    setSent(clean);
    onCommit(clean);
  }

  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-3.5">
          {icon}
        </span>
      )}
      <Input
        {...props}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(next), delay);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Escape" && text) {
            setText("");
            commit("");
          }
        }}
        className={cn(icon && "pl-8", clearable && text && "pr-7", className)}
      />
      {clearable && text && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => {
            setText("");
            commit("");
          }}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

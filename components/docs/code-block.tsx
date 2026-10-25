"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = "bash", className = "" }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`relative group my-3 overflow-hidden rounded-lg border border-border bg-muted/40 ${className}`}>
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/80 px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
        <span>{language}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          className="h-6 gap-1 px-2 text-xs hover:text-foreground"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

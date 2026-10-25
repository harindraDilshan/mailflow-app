"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="gap-1 font-mono text-[11px]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <>
          <Check className="size-3 text-foreground" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3 text-muted-foreground" />
          <span>Copy</span>
        </>
      )}
    </Button>
  );
}

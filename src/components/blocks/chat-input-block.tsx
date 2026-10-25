"use client";

import * as React from "react";
import { CornerDownLeft, Paperclip, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { placeholders } from "@/src/lib/placeholders";

export function ChatInputBlock() {
  const [value, setValue] = React.useState("");

  return (
    <Card className="relative overflow-hidden p-3 border-border">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholders.chat.placeholder}
        className="min-h-20 resize-none border-0 p-1 shadow-none focus-visible:ring-0 text-sm"
      />
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={placeholders.button}>
            <Paperclip className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={placeholders.button}>
            <Mic className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            {placeholders.zeroValue}
          </span>
          <Button size="xs" className="gap-1 px-2.5">
            <span>{placeholders.chat.button}</span>
            <CornerDownLeft className="size-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

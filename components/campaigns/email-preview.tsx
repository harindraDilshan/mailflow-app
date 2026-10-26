"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { htmlToText, renderEmail } from "@/lib/email/render";

const SAMPLE = { name: "Jane", email: "jane@example.com" };
const EMPTY = `<p style="font-family:Arial,sans-serif;color:#71717a">Your email content shows here.</p>`;

/**
 * The email as a subscriber sees it: first the line in the inbox, then the opened email.
 * The iframe has no scripts and no access to the app (sandbox).
 */
export function EmailPreview({
  html,
  subject,
  previewText,
  fromName,
  fromEmail,
  className,
}: {
  html: string;
  subject: string;
  previewText?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  className?: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const rendered = useMemo(() => {
    const doc = renderEmail(html.trim() ? html : EMPTY, SAMPLE, "#", undefined, { previewText });
    // <base target="_blank">: links open in a new tab, not inside the preview.
    // It goes after <head> or <html>: before <!doctype> it would switch the page to quirks mode.
    const base = `<base target="_blank">`;
    if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, (tag) => tag + base);
    if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, (tag) => tag + base);
    return base + doc;
  }, [html, previewText]);
  // Without preview text, inbox apps show the first words of the email.
  const inboxText = (previewText?.trim() || htmlToText(html.replace(/\{\{\s*name\s*\}\}/gi, SAMPLE.name))).slice(0, 110);
  const sender = fromName?.trim() || fromEmail?.trim() || "Your name";

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-medium">Preview</span>
        <Tabs value={device} onValueChange={(v) => setDevice(v === "mobile" ? "mobile" : "desktop")}>
          <TabsList className="h-7">
            <TabsTrigger value="desktop" className="px-2 text-xs">
              <Monitor />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="px-2 text-xs">
              <Smartphone />
              Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-start gap-2.5 border-b border-border px-3 py-2.5">
        <Avatar size="sm">
          <AvatarFallback className="text-[10px]">{initials(sender, sender)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-xs">
          <div className="truncate font-medium">{sender}</div>
          <div className="truncate">
            <span className="font-medium">{subject.trim() || "(no subject)"}</span>
            {inboxText && <span className="text-muted-foreground"> — {inboxText}</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-center bg-muted/40 p-3">
        <iframe
          title="Email preview"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={rendered}
          className={cn(
            "h-[560px] rounded-md border border-border bg-white transition-[width] duration-200",
            device === "mobile" ? "w-[375px] max-w-full" : "w-full"
          )}
        />
      </div>
      <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        Merge tags show sample data ({SAMPLE.name}). Mailflow adds the unsubscribe footer to every email.
      </p>
    </div>
  );
}

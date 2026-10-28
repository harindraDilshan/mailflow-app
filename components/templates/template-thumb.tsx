"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderDesign, type EmailDesign } from "@/lib/email-design";
import { cn } from "@/lib/utils";

// Wide enough that the email does not switch to its phone layout.
const FRAME_WIDTH = 640;

/** The HTML that a thumbnail or a preview of a template shows. */
export function templateHtml(t: { design: EmailDesign | null; html?: string }) {
  return t.design ? renderDesign(t.design, { preview: true }) : (t.html ?? "");
}

/**
 * A small picture of an email: the real email in an iframe, scaled down to fit.
 * The iframe has no scripts and cannot be clicked or focused.
 */
export function TemplateThumb({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const doc = useMemo(
    () => html.replace(/\{\{\s*name\s*\}\}/gi, "Jane").replace(/\{\{\s*email\s*\}\}/gi, "jane@example.com"),
    [html]
  );
  const scale = size.w / FRAME_WIDTH;

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-muted/40", className)} aria-hidden>
      {scale > 0 && (
        <iframe
          title=""
          tabIndex={-1}
          sandbox=""
          srcDoc={doc}
          loading="lazy"
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white"
          style={{ width: FRAME_WIDTH, height: size.h / scale, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

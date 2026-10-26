import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Lightbulb, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_PAGES } from "@/app/docs/api/pages";

// Small building blocks for the docs pages, so every page looks the same.

export function DocTitle({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead: React.ReactNode }) {
  return (
    <header className="space-y-2 border-b border-border pb-6">
      {eyebrow && <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p>
    </header>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="group flex scroll-mt-20 items-center gap-2 pt-4 text-lg font-semibold tracking-tight">
      {children}
      <a href={`#${id}`} aria-label="Link to this section" className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <Link2 className="size-4" />
      </a>
    </h2>
  );
}

export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground", className)}>{children}</p>;
}

export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}

export function Callout({ tone = "info", title, children }: { tone?: "info" | "tip" | "warning"; title?: string; children: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "tip" ? Lightbulb : Info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        tone === "warning" && "border-amber-500/30 bg-amber-500/10",
        tone === "tip" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "info" && "border-border bg-muted/50"
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-amber-600" : tone === "tip" ? "text-emerald-600" : "text-muted-foreground")} />
      <div className="space-y-1 text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
        {title && <p className="font-medium text-foreground">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Endpoint({ method, path }: { method: "GET" | "POST"; path: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[11px] font-semibold",
          method === "POST" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        )}
      >
        {method}
      </span>
      <span className="break-all">{path}</span>
    </div>
  );
}

export type Param = { name: string; type: string; required?: boolean | string; children: React.ReactNode };

export function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {params.map((p) => (
        <div key={p.name} className="space-y-1 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <code className="font-mono font-semibold text-foreground">{p.name}</code>
            <span className="text-muted-foreground">{p.type}</span>
            {p.required && (
              <span className="rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:text-amber-300">
                {p.required === true ? "required" : p.required}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">{p.children}</div>
        </div>
      ))}
    </div>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-6 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative space-y-3 pl-9 [counter-increment:step] before:absolute before:top-0 before:left-0 before:flex before:size-6 before:items-center before:justify-center before:rounded-full before:border before:border-border before:bg-muted before:text-xs before:font-medium before:content-[counter(step)]">
      <h3 className="pt-0.5 text-sm font-semibold">{title}</h3>
      {children}
    </li>
  );
}

export function PrevNext({ href }: { href: string }) {
  const i = DOC_PAGES.findIndex((p) => p.href === href);
  const prev = i > 0 ? DOC_PAGES[i - 1] : null;
  const next = i >= 0 && i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : null;
  const box = "flex flex-1 flex-col gap-0.5 rounded-lg border border-border p-3 text-sm transition-colors hover:border-foreground/30 hover:bg-muted/40";
  return (
    <nav className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row" aria-label="Previous and next page">
      {prev ? (
        <Link href={prev.href} className={box}>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><ArrowLeft className="size-3" />Previous</span>
          <span className="font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next && (
        <Link href={next.href} className={cn(box, "items-end text-right")}>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">Next<ArrowRight className="size-3" /></span>
          <span className="font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

// A page body with the same width and spacing everywhere.
export function DocPageBody({ children }: { children: React.ReactNode }) {
  return <article className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8 lg:py-10">{children}</article>;
}

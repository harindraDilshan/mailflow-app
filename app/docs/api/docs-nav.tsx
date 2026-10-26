"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_PAGES } from "./pages";

const GROUPS = [...new Set(DOC_PAGES.map((p) => p.group))];

function Links({ onPick }: { onPick?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Docs" className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g} className="space-y-1">
          <p className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g}</p>
          {DOC_PAGES.filter((p) => p.group === g).map((p) => {
            const active = path === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                onClick={onPick}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {p.title}
                {"method" in p && (
                  <span className={cn("font-mono text-[10px] font-semibold", p.method === "POST" ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {p.method}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
      <div className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto p-4">
        <Links />
      </div>
    </aside>
  );
}

// Phones and small screens: the same menu in a drop-down.
export function DocsMobileNav() {
  const path = usePathname();
  const current = DOC_PAGES.find((p) => p.href === path);
  return (
    <details className="group border-b border-border lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm">
        <Menu className="size-4" />
        <span className="font-medium">{current?.title ?? "Docs"}</span>
      </summary>
      <div className="px-2 pb-4">
        <Links
          onPick={() => {
            const open = document.querySelector("details[open]");
            open?.removeAttribute("open");
          }}
        />
      </div>
    </details>
  );
}

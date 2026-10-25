import { ThemeToggle } from "@/components/theme-toggle";
import { Box } from "lucide-react";
import Link from "next/link";
import { placeholders } from "@/src/lib/placeholders";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
      <header className="flex h-14 w-full items-center justify-between border-b border-border px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-medium tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted">
            <Box className="size-4 text-foreground" />
          </div>
          <span className="text-sm font-medium">{placeholders.appTitle}</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

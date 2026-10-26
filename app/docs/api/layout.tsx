import { Suspense } from "react";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DocsMobileNav, DocsSidebar } from "./docs-nav";

export const metadata = {
  title: { default: "Mailflow API docs", template: "%s · Mailflow API docs" },
  description: "Add subscribers to your Mailflow lists from your website or your server.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
        <Link href="/docs/api" className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[11px] text-primary-foreground">API</span>
          Mailflow docs
        </Link>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <AccountLinks />
          </Suspense>
          <ThemeToggle />
        </div>
      </header>
      <DocsMobileNav />
      <div className="mx-auto flex max-w-7xl">
        <DocsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

async function AccountLinks() {
  const user = await getLoggedInUser();
  return user ? (
    <>
      <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/contacts/forms" />}>
        Sign-up forms
      </Button>
      <Button variant="outline" size="sm" render={<Link href="/developers" />}>
        API keys
      </Button>
    </>
  ) : (
    <Button variant="outline" size="sm" render={<Link href="/login?next=/developers" />}>
      Log in
    </Button>
  );
}

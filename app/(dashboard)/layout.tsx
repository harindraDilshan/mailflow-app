import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading...</p>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          <Link href="/contacts">Contacts</Link>
          <Link href="/domains">Domains</Link>
          <Link href="/campaigns">Campaigns</Link>
          <Link href="/automations">Automations</Link>
        </nav>
        <div className="flex items-center gap-4">
          <span>{user.email}</span>
          <form action={signOut}>
            <button className="underline">Log out</button>
          </form>
        </div>
      </header>
      {!user.emailVerification && (
        <p className="mb-4 rounded bg-yellow-100 p-3 text-sm">
          Please verify your email. Check your inbox.
        </p>
      )}
      {children}
    </div>
  );
}
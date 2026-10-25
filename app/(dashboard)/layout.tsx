import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/src/components/blocks/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-xs text-muted-foreground">
          Loading...
        </div>
      }
    >
      <DashboardRoot>{children}</DashboardRoot>
    </Suspense>
  );
}

async function DashboardRoot({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <DashboardShell
      userEmail={user.email}
      isVerified={Boolean(user.emailVerification)}
    >
      {children}
    </DashboardShell>
  );
}

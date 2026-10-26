"use client";

import * as React from "react";
import { Header } from "@/src/components/blocks/header";
import { Sidebar } from "@/src/components/blocks/sidebar";
import { signOut } from "@/app/(auth)/actions";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  userEmail: string;
  isVerified?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  userEmail,
  isVerified = true,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
      <Header
        userEmail={userEmail}
        onMenuToggle={() => setMobileOpen(!mobileOpen)}
        onSignOut={() => signOut()}
      />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] self-start z-30">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            className="h-full"
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-50 flex w-72 flex-col bg-sidebar shadow-xl">
              <Sidebar
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                className="w-full h-full border-r-0"
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          {!isVerified && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Verify your email address.</span> We sent a link to{" "}
                {userEmail}. You need it to send campaigns and turn on automations.
              </span>
              <ResendVerificationButton />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

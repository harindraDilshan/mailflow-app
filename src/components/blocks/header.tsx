"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Mail, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { placeholders } from "@/src/lib/placeholders";

interface HeaderProps {
  onMenuToggle?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}

export function Header({ onMenuToggle, userEmail, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur transition-colors md:px-6">
      {/* Left: Mobile Trigger & Mailflow Brand */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuToggle}
            className="md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="size-4" />
          </Button>
        )}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-medium tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted">
            <Mail className="size-4 text-foreground" />
          </div>
          <span className="text-sm font-semibold">{placeholders.appTitle}</span>
        </Link>
      </div>

      {/* Center: Search with shortcut hint */}
      <div className="hidden max-w-sm flex-1 px-4 sm:flex">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholders.search}
            className="h-8 w-full pl-8 pr-11 text-xs"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 flex h-4 -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
            {placeholders.searchShortcut}
          </kbd>
        </div>
      </div>

      {/* Right: Theme Toggle & User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="User menu"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="text-[11px] font-medium">
                {userEmail ? userEmail.slice(0, 2).toUpperCase() : "MF"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-medium leading-none text-foreground">
                    Account
                  </p>
                  <p className="text-[11px] leading-none text-muted-foreground">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/contacts" />}>
              Contacts
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/campaigns" />}>
              Campaigns
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/domains" />}>
              Sending Domains
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings#two-factor" />}>
              2-step verification
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onSignOut ? (
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
                Log out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                render={
                  <form action="/api/auth/signout" method="POST" className="w-full">
                    <button type="submit" className="w-full text-left" />
                  </form>
                }
                className="cursor-pointer text-destructive"
              >
                Log out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

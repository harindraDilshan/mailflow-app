"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Workflow,
  Users,
  ListFilter,
  Upload,
  Globe,
  Key,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { placeholders } from "@/src/lib/placeholders";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function Sidebar({ collapsed = false, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();

  const groups = [
    {
      title: placeholders.nav.outreach,
      items: [
        { label: placeholders.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
        { label: placeholders.nav.campaigns, href: "/campaigns", icon: Send },
        { label: placeholders.nav.automations, href: "/automations", icon: Workflow },
      ],
    },
    {
      title: placeholders.nav.audience,
      items: [
        { label: placeholders.nav.contacts, href: "/contacts", icon: Users },
        { label: placeholders.nav.lists, href: "/contacts/lists", icon: ListFilter },
        { label: placeholders.nav.importCsv, href: "/contacts/import", icon: Upload },
      ],
    },
    {
      title: placeholders.nav.configuration,
      items: [
        { label: placeholders.nav.domains, href: "/domains", icon: Globe },
        { label: placeholders.nav.developers, href: "/developers", icon: Key },
        { label: placeholders.nav.docs, href: "/docs/api", icon: BookOpen },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-150 h-full",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-full flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed ? (
                <h3 className="px-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  {group.title}
                </h3>
              ) : (
                <div className="my-2 border-t border-border" />
              )}

              <nav className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  const linkContent = (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className={cn(
                        "group flex h-8 items-center gap-3 rounded-md px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={itemIdx}>
                        <TooltipTrigger render={linkContent} />
                        <TooltipContent side="right">
                          <p className="text-xs">{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Collapse Toggle */}
        {onToggleCollapse && (
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={cn(
                "w-full text-muted-foreground",
                collapsed ? "px-0 justify-center" : "justify-start gap-2"
              )}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <>
                  <ChevronLeft className="size-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

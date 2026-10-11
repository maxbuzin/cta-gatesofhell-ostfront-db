"use client";

import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden self-stretch shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 md:block",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-y-auto">
        <div className="flex h-10 shrink-0 items-center justify-end border-b border-border px-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </Button>
        </div>
        {!collapsed ? <SidebarNav /> : null}
      </div>
    </aside>
  );
}

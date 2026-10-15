"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useRailCollapsed } from "@/components/layout/rail-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";

export const desktopRailClass =
  "fixed top-(--chrome-h) left-0 z-30 hidden h-[calc(100dvh_-_var(--chrome-h)_-_var(--tray-h,0px))] w-[var(--rail-left)] flex-col overflow-hidden border-r-[var(--rail-border,0px)] border-border bg-sidebar md:flex";

export function DesktopSidebar() {
  const iconOnly = useRailCollapsed();

  return (
    <aside data-rail className={desktopRailClass}>
      <ScrollArea type="auto" className="h-full">
        <SidebarNav iconOnly={iconOnly} />
      </ScrollArea>
    </aside>
  );
}

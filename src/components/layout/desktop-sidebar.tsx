import { SidebarNav } from "@/components/layout/sidebar-nav";

export function DesktopSidebar() {
  return (
    <aside className="hidden h-full w-56 shrink-0 overflow-y-auto border-r border-border bg-sidebar md:block">
      <SidebarNav />
    </aside>
  );
}

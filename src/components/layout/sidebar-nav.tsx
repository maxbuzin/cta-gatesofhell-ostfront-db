"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useCompare } from "@/lib/compare-store";
import { Badge } from "@/components/ui/badge";

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/research/")) return pathname.startsWith("/research/");
  if (href.startsWith("/factions/")) return pathname.startsWith("/factions/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

const GROUPS = [
  {
    label: "Browse",
    hrefs: ["/", "/units", "/compare", "/research/germany", "/factions/germany"],
  },
  {
    label: "Reference",
    hrefs: ["/patches", "/sources", "/about"],
  },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { items } = useCompare();

  return (
    <nav aria-label="Main" className="flex flex-col p-3">
      {GROUPS.map((group, index) => (
        <div
          key={group.label}
          role="group"
          aria-label={group.label}
          className={cn(
            "flex flex-col gap-1",
            index > 0 && "mt-4 border-t border-border pt-4",
          )}
        >
          {group.hrefs.map((href) => {
            const item = NAV_ITEMS.find((entry) => entry.href === href);
            if (!item) return null;
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "hit-row flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                  active
                    ? "bg-primary/20 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badge === "compare" && items.length > 0 ? (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 font-stat">
                    {items.length}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

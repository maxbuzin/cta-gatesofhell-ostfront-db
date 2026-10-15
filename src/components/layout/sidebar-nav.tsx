"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { useCompare } from "@/lib/compare-store";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function NavRow({
  item,
  active,
  count,
  iconOnly,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count: number;
  iconOnly: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "hit-row flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        iconOnly && "justify-center px-0",
        active
          ? "bg-primary/20 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="relative">
        <Icon className="size-4 shrink-0" aria-hidden />
        {iconOnly && count > 0 ? (
          <Badge
            variant="secondary"
            className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] font-stat"
          >
            {count}
          </Badge>
        ) : null}
      </span>
      <span className={cn("flex-1", iconOnly && "sr-only")}>{item.label}</span>
      {!iconOnly && count > 0 ? (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 font-stat">
          {count}
        </Badge>
      ) : null}
    </Link>
  );

  if (!iconOnly) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {count > 0 ? `${item.label} (${count})` : item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({
  onNavigate,
  iconOnly = false,
}: {
  onNavigate?: () => void;
  iconOnly?: boolean;
}) {
  const pathname = usePathname();
  const { items } = useCompare();

  return (
    <nav
      aria-label="Main"
      className={cn("flex flex-col p-3", iconOnly && "px-1.5")}
    >
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
            const count = item.badge === "compare" ? items.length : 0;
            return (
              <NavRow
                key={item.href}
                item={item}
                active={isActive(item.href, pathname)}
                count={count}
                iconOnly={iconOnly}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

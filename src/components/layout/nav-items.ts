import {
  BookOpen,
  GitCompare,
  Home,
  Info,
  Library,
  Network,
  Flag,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "compare";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/units", label: "Units", icon: Users },
  { href: "/compare", label: "Compare", icon: GitCompare, badge: "compare" },
  { href: "/research/germany", label: "Research Tree", icon: Network },
  { href: "/factions/germany", label: "Factions", icon: Flag },
  { href: "/patches", label: "Patch Notes", icon: ScrollText },
  { href: "/sources", label: "Sources & Credits", icon: Library },
  { href: "/about", label: "About", icon: Info },
];

export const BOOK_ICON = BookOpen;

# Shared layouts

App shell is `src/app/layout.tsx`. Every route uses it. No per-route layout files.

## layout.tsx

Root shell. Fixed chrome, left rail from md, main column, footer, compare tray. Offsets use --chrome-h and --tray-h.

### `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Black_Ops_One, JetBrains_Mono, Syne_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/layout/top-bar";
import { ChromeBar } from "@/components/layout/chrome-bar";
import {
  DesktopSidebar,
  desktopRailClass,
} from "@/components/layout/desktop-sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { CompareTray } from "@/components/compare/compare-tray";
import {
  getCurrentGameVersion,
  getSearchIndex,
} from "@/lib/db/queries/units";
import { withQueryFallback } from "@/lib/safe-query";

const syneMono = Syne_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-syne-mono",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const stencil = Black_Ops_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-stencil",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Ostfront DB",
    template: "%s | Ostfront DB",
  },
  description:
    "Free, open-source unit database for Call to Arms – Gates of Hell: Ostfront. Search, compare, and explore Conquest research trees.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [searchIndex, gameVersion] = await Promise.all([
    withQueryFallback(() => getSearchIndex(), [], "Failed to load search index"),
    withQueryFallback(
      () => getCurrentGameVersion(),
      null,
      "Failed to load game version",
    ),
  ]);

  return (
    <html
      lang="en"
      className={cn(syneMono.variable, jetbrains.variable, stencil.variable)}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
        >
          Skip to content
        </a>
        <Providers>
          <ChromeBar>
            <Suspense fallback={null}>
              <TopBar searchIndex={searchIndex} />
            </Suspense>
          </ChromeBar>
          <div className="flex min-h-dvh flex-col pt-[var(--chrome-h)] pb-[var(--tray-h,0px)] md:pl-56 lg:has-[[data-right-rail]]:pr-80">
            <Suspense fallback={<aside className={desktopRailClass} />}>
              <DesktopSidebar />
            </Suspense>
            <main id="main" className="flex flex-1 flex-col">
              <div className="flex-1 px-3 py-6 md:px-6">{children}</div>
              <SiteFooter gameVersion={gameVersion?.code ?? null} />
            </main>
          </div>
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}
```

## chrome-bar.tsx

Fixed top wrapper. Measures height into --chrome-h.

### `src/components/layout/chrome-bar.tsx`

```tsx
"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function ChromeBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--chrome-h",
        `${el.offsetHeight}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--chrome-h");
    };
  }, []);

  return (
    <div ref={ref} className="fixed inset-x-0 top-0 z-40">
      {children}
    </div>
  );
}
```

## top-bar.tsx

Header row: menu, logo, wordmark, non-official badge, search, Buy on Steam. Faction chips absolutely centered from lg.

### `src/components/layout/top-bar.tsx`

```tsx
import Link from "next/link";
import { CommandSearch, type SearchIndexItem } from "@/components/search/command-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FactionChips } from "@/components/layout/faction-chips";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEAM_URL =
  "https://store.steampowered.com/app/400750/Call_to_Arms__Gates_of_Hell_Ostfront/";

const SHOW_GITHUB = false;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2C6.477 2 2 6.584 2 12.253c0 4.526 2.865 8.363 6.839 9.718.5.094.682-.222.682-.486 0-.24-.009-.875-.014-1.718-2.782.619-3.37-1.37-3.37-1.37-.454-1.18-1.11-1.494-1.11-1.494-.908-.636.069-.623.069-.623 1.003.072 1.53 1.056 1.53 1.056.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.259-4.555-1.138-4.555-5.067 0-1.12.39-2.036 1.03-2.754-.103-.26-.447-1.303.098-2.716 0 0 .84-.275 2.75 1.052A9.36 9.36 0 0 1 12 6.844a9.36 9.36 0 0 1 2.504.345c1.909-1.327 2.748-1.052 2.748-1.052.547 1.413.203 2.456.1 2.716.64.718 1.028 1.634 1.028 2.754 0 3.94-2.339 4.805-4.566 5.058.359.318.679.944.679 1.904 0 1.374-.012 2.482-.012 2.82 0 .267.18.586.688.486A10.27 10.27 0 0 0 22 12.253C22 6.584 17.523 2 12 2Z" />
    </svg>
  );
}

export function TopBar({ searchIndex }: { searchIndex: SearchIndexItem[] }) {
  return (
    <header className="relative z-40 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <div className="relative z-10 flex items-center gap-2 self-stretch bg-background">
          <MobileNav />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity duration-150 hover:opacity-90"
          >
            <BrandLogo />
            <span className="hidden font-display text-lg tracking-wider text-foreground sm:inline">
              OSTFRONT DB
            </span>
          </Link>
          <Badge
            variant="outline"
            className="hidden border-brass/60 px-2 py-0.5 text-[10px] tracking-widest text-brass uppercase sm:inline-flex"
          >
            Non-official website
          </Badge>
          {SHOW_GITHUB ? (
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
              >
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2 self-stretch bg-background">
          <div className="min-w-0 md:w-40 xl:w-72">
            <CommandSearch index={searchIndex} />
          </div>
          <Button size="xs" asChild>
            <a href={STEAM_URL} target="_blank" rel="noopener noreferrer">
              Buy on Steam
            </a>
          </Button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)] hidden h-14 items-center justify-center lg:flex">
        <FactionChips className="pointer-events-auto flex-nowrap" />
      </div>
    </header>
  );
}
```

## brand-logo.tsx

img /logo.webp, 32px, alt empty.

### `src/components/layout/brand-logo.tsx`

```tsx
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      alt=""
      width={32}
      height={32}
      className={cn("size-8 shrink-0", className)}
    />
  );
}
```

## desktop-sidebar.tsx

Fixed left rail, w-56, hidden below md.

### `src/components/layout/desktop-sidebar.tsx`

```tsx
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ScrollArea } from "@/components/ui/scroll-area";

export const desktopRailClass =
  "fixed top-(--chrome-h) left-0 z-30 hidden h-[calc(100dvh_-_var(--chrome-h)_-_var(--tray-h,0px))] w-56 flex-col overflow-hidden border-r border-border bg-sidebar md:flex";

export function DesktopSidebar() {
  return (
    <aside className={desktopRailClass}>
      <ScrollArea type="auto" className="h-full">
        <SidebarNav />
      </ScrollArea>
    </aside>
  );
}
```

## sidebar-nav.tsx

Flat nav list. Active route highlight. Compare count badge.

### `src/components/layout/sidebar-nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useCompare } from "@/lib/compare-store";
import { Badge } from "@/components/ui/badge";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { items } = useCompare();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </nav>
  );
}
```

## nav-items.ts

Nav item definitions.

### `src/components/layout/nav-items.ts`

```ts
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
```

## mobile-nav.tsx

Sheet menu below md.

### `src/components/layout/mobile-nav.tsx`

```tsx
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="font-display tracking-wide">
              OSTFRONT DB
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

## faction-chips.tsx

Germany, USSR, USA, British Commonwealth links to /units?faction=.

### `src/components/layout/faction-chips.tsx`

```tsx
import Link from "next/link";
import { FACTIONS } from "@/lib/factions";
import { safeCssColor } from "@/lib/safe-css-color";
import { cn } from "@/lib/utils";

export function FactionChips({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className,
      )}
      aria-label="Faction filters"
    >
      {FACTIONS.map((f) => (
        <Link
          key={f.slug}
          href={`/units?faction=${f.slug}`}
          className={cn(
            "hit-row inline-flex items-center gap-1.5 rounded border border-border transition-colors duration-150 hover:border-primary",
            size === "sm"
              ? "px-1.5 py-0.5 text-[11px] leading-tight"
              : "px-3 py-1.5 text-sm",
          )}
        >
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: safeCssColor(f.color) }}
            aria-hidden
          />
          {f.nameEn}
        </Link>
      ))}
    </div>
  );
}
```

## site-footer.tsx

Large meta footer. Logo, version, license, trademark.

### `src/components/layout/site-footer.tsx`

```tsx
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

const linkClass = "text-primary underline-offset-2 hover:underline";

export function SiteFooter({ gameVersion }: { gameVersion: string | null }) {
  return (
    <footer className="mt-16 w-full border-t border-border bg-surface/60 px-8 pt-14 pb-2 text-sm text-muted-foreground md:mt-24 md:px-12 md:pt-20 md:pb-2">
      <div className="flex w-full flex-col gap-10 pb-[env(safe-area-inset-bottom)] md:gap-14">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex items-start gap-3">
            <BrandLogo className="size-10" />
            <div className="space-y-2">
              <p className="font-stat text-foreground">
                Game {gameVersion ? `v${gameVersion}` : "version --"}
              </p>
              <p>
                Not affiliated with Barbedwire Studios / 1C Entertainment /
                Digitalmindsoft.
              </p>
            </div>
          </div>
          <div className="space-y-2 md:text-right">
            <p>
              Data:{" "}
              <Link href="/sources" className={linkClass}>
                CC BY-SA
              </Link>{" "}
              (from community sources / GoH Fandom wiki)
            </p>
            <p>
              Code:{" "}
              <a
                href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/blob/main/LICENSE"
                className={linkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT
              </a>
            </p>
          </div>
        </div>
        <p className="border-t border-border pt-8 leading-relaxed">
          Call to Arms – Gates of Hell: Ostfront and related names and assets
          are trademarks and/or copyrights of their respective owners. Developed
          by{" "}
          <a
            href="https://www.dev.maxbuzin.com"
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            maxbuzin
          </a>{" "}
          (vibecoded).
        </p>
      </div>
    </footer>
  );
}
```

## compare-tray.tsx

Fixed bottom tray when compare items exist. Sets --tray-h.

### `src/components/compare/compare-tray.tsx`

```tsx
"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useCompare } from "@/lib/compare-store";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      document.documentElement.style.setProperty("--tray-h", "0px");
      return;
    }
    const apply = () => {
      document.documentElement.style.setProperty(
        "--tray-h",
        `${el.offsetHeight}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--tray-h", "0px");
    };
  }, [items.length]);

  if (items.length === 0) return null;

  const href = `/compare?units=${items.map((i) => i.slug).join(",")}`;

  return (
    <div
      ref={ref}
      data-compare-tray
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 py-3 md:pr-6 md:pl-[calc(14rem+1.5rem)] lg:[html:has([data-right-rail])_&]:pr-[calc(20rem+1.5rem)]"
      role="region"
      aria-label="Compare tray"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Compare ({items.length}/4)
        </span>
        <div className="flex flex-1 flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <span className="max-w-36 truncate">{item.name}</span>
              <button
                type="button"
                className="hit-row inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item.name}`}
                onClick={() => remove(item.slug)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" asChild>
            <Link href={href}>Compare</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## command-search.tsx

Header search. Desktop input opens command dialog. Mobile icon.

### `src/components/search/command-search.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Crosshair, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchIndexItem = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  factionSlug: string;
  typeCode: string;
  typeName: string;
};

export function CommandSearch({ index }: { index: SearchIndexItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: ["name", "shortName", "slug", "typeName", "factionSlug"],
        threshold: 0.35,
      }),
    [index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return index.slice(0, 20);
    return fuse.search(query).slice(0, 30).map((r) => r.item);
  }, [fuse, index, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchIndexItem[]>();
    for (const item of results) {
      const list = map.get(item.typeName) ?? [];
      list.push(item);
      map.set(item.typeName, list);
    }
    return map;
  }, [results]);

  return (
    <>
      <div className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          placeholder="Search units... (Ctrl+K)"
          className="cursor-pointer pl-9"
          onClick={() => setOpen(true)}
          aria-label="Open search"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search any unit: Panther, ZiS-3, Pz IV H..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {index.length === 0 ? "No units yet" : "No results found."}
          </CommandEmpty>
          {[...grouped.entries()].map(([type, items]) => (
            <CommandGroup key={type} heading={type}>
              {items.map((item) => (
                <CommandItem
                  key={item.slug}
                  value={`${item.name} ${item.shortName ?? ""} ${item.slug}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/units/${item.slug}`);
                  }}
                >
                  <Crosshair className="size-4 text-muted-foreground" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.factionSlug}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
```


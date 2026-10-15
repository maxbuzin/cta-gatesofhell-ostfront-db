import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Black_Ops_One, JetBrains_Mono, Syne_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/layout/top-bar";
import { ChromeBar } from "@/components/layout/chrome-bar";
import { DesktopSidebar, desktopRailClass } from "@/components/layout/desktop-sidebar";
import { RailToggle } from "@/components/layout/rail-toggle";
import { SiteFooter } from "@/components/layout/site-footer";
import { CompareTray } from "@/components/compare/compare-tray";
import { RightRailOffset } from "@/components/layout/right-rail-offset";
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

async function SearchBar() {
  const searchIndex = await withQueryFallback(
    () => getSearchIndex(),
    [],
    "Failed to load search index",
  );
  return <TopBar searchIndex={searchIndex} />;
}

async function VersionFooter() {
  const gameVersion = await withQueryFallback(
    () => getCurrentGameVersion(),
    null,
    "Failed to load game version",
  );
  return <SiteFooter gameVersion={gameVersion?.code ?? null} />;
}

function SearchBarFallback() {
  return (
    <header className="relative z-40 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="h-14" />
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        syneMono.variable,
        jetbrains.variable,
        stencil.variable,
      )}
    >
      <body>
        <style>{`@media (min-width: 48rem) { :root { --rail-left: 14rem; --shell-x: 1.5rem; --rail-border: 1px } }`}</style>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
        >
          Skip to content
        </a>
        <RightRailOffset />
        <Providers>
          <ChromeBar>
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBar />
            </Suspense>
          </ChromeBar>
          <div className="flex min-h-dvh flex-col pt-[var(--chrome-h)] pr-[var(--rail-right)] pb-[var(--tray-h,0px)] pl-[var(--rail-left)]">
            <Suspense fallback={<aside className={desktopRailClass} />}>
              <DesktopSidebar />
            </Suspense>
            <main id="main" className="flex flex-1 flex-col">
              <div className="flex items-center gap-3 px-[var(--shell-x)] pt-4 pb-6">
                <RailToggle />
                <div
                  id="content-crumbs"
                  className="flex min-w-0 flex-1 items-center gap-3"
                />
              </div>
              <div className="flex-1 px-[var(--shell-x)] pb-6">{children}</div>
              <Suspense fallback={<SiteFooter gameVersion={null} />}>
                <VersionFooter />
              </Suspense>
            </main>
          </div>
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}

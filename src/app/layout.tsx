import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Black_Ops_One, JetBrains_Mono, Syne_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/layout/top-bar";
import { SteamBanner } from "@/components/layout/steam-banner";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
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
      className={cn(
        "h-full",
        syneMono.variable,
        jetbrains.variable,
        stencil.variable,
      )}
    >
      <body className="h-dvh overflow-hidden">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
        >
          Skip to content
        </a>
        <Providers>
          <div className="flex h-dvh flex-col overflow-hidden">
            <div className="shrink-0">
              <Suspense fallback={null}>
                <TopBar searchIndex={searchIndex} />
              </Suspense>
              <SteamBanner />
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <Suspense fallback={<aside className="hidden h-full w-56 shrink-0 border-r border-border md:block" />}>
                <DesktopSidebar />
              </Suspense>
              <main
                id="main"
                className="min-h-0 min-w-0 flex-1 overflow-y-auto"
              >
                <div className="px-3 py-6 md:px-6 has-[[data-units-frame]]:h-full has-[[data-units-frame]]:overflow-hidden has-[[data-units-frame]]:p-0">
                  {children}
                </div>
                <SiteFooter gameVersion={gameVersion?.code ?? null} />
              </main>
            </div>
            <CompareTray />
          </div>
        </Providers>
      </body>
    </html>
  );
}

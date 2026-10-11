import type { Metadata } from "next";
import { Suspense } from "react";
import { Black_Ops_One, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/layout/top-bar";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { CompareTray } from "@/components/compare/compare-tray";
import {
  getCurrentGameVersion,
  getSearchIndex,
} from "@/lib/db/queries/units";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
}: LayoutProps<"/">) {
  const [searchIndex, gameVersion] = await Promise.all([
    getSearchIndex(),
    getCurrentGameVersion(),
  ]);

  return (
    <html
      lang="en"
      className={cn(
        "dark h-full",
        inter.variable,
        jetbrains.variable,
        stencil.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
        >
          Skip to content
        </a>
        <Providers>
          <Suspense fallback={null}>
            <TopBar searchIndex={searchIndex} />
          </Suspense>
          <div className="flex flex-1">
            <Suspense fallback={<aside className="hidden w-56 shrink-0 border-r border-border md:block" />}>
              <DesktopSidebar />
            </Suspense>
            <main id="main" className="min-w-0 flex-1 px-3 py-6 pb-24 md:px-6">
              {children}
            </main>
          </div>
          <SiteFooter gameVersion={gameVersion?.code ?? null} />
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}

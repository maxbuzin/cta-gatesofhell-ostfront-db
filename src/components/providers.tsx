"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CompareProvider } from "@/lib/compare-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <TooltipProvider delayDuration={200}>
        <CompareProvider>
          {children}
          <Toaster />
        </CompareProvider>
      </TooltipProvider>
    </NuqsAdapter>
  );
}

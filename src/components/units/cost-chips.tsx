"use client";

import { Coins, HardHat } from "lucide-react";
import { formatStat } from "@/lib/safe";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CostChips({
  cp,
  resources,
}: {
  cp: number | null | undefined;
  resources: number | null | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
            <HardHat className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="sr-only">Command points</span>
            {formatStat(cp)}
          </span>
        </TooltipTrigger>
        <TooltipContent>Command points</TooltipContent>
      </Tooltip>
      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
        <Coins className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Shield resources</span>
        {formatStat(resources)}
      </span>
    </div>
  );
}

import { Coins, HardHat } from "lucide-react";
import { formatStat } from "@/lib/safe";

export function CostChips({
  cp,
  resources,
}: {
  cp: number | null | undefined;
  resources: number | null | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
        <HardHat className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Helmet CP</span>
        {formatStat(cp)}
      </span>
      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
        <Coins className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Shield resources</span>
        {formatStat(resources)}
      </span>
    </div>
  );
}

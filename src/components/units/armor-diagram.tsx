import { formatStat } from "@/lib/safe";

export function ArmorDiagram({
  front,
  side,
  rear,
  top,
}: {
  front: number | null | undefined;
  side: number | null | undefined;
  rear: number | null | undefined;
  top: number | null | undefined;
}) {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 text-center font-stat text-sm">
      <div />
      <div className="rounded border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">Front</div>
        <div>{formatStat(front)} mm</div>
      </div>
      <div />
      <div className="rounded border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">Side</div>
        <div>{formatStat(side)} mm</div>
      </div>
      <div className="relative flex aspect-square items-center justify-center rounded border border-primary/40 bg-muted/50">
        <svg viewBox="0 0 80 80" className="h-16 w-16 text-muted-foreground" aria-hidden>
          <rect x="18" y="28" width="44" height="24" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="30" y="18" width="20" height="14" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
        <span className="absolute bottom-1 text-[10px] text-muted-foreground">Top {formatStat(top)}</span>
      </div>
      <div className="rounded border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">Side</div>
        <div>{formatStat(side)} mm</div>
      </div>
      <div />
      <div className="rounded border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">Rear</div>
        <div>{formatStat(rear)} mm</div>
      </div>
      <div />
    </div>
  );
}

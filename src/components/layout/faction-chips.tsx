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

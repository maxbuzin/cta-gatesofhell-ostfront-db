import { cn } from "@/lib/utils";
import { FACTION_COLORS } from "@/lib/factions";

export function FactionBadge({
  slug,
  name,
  color,
  className,
}: {
  slug: string;
  name: string;
  color?: string | null;
  className?: string;
}) {
  const bg = color || FACTION_COLORS[slug] || "#7A8B5C";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-white",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      {name}
    </span>
  );
}

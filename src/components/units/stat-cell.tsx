import {
  CircleDot,
  Coins,
  Crosshair,
  Eye,
  Gauge,
  HardHat,
  Heart,
  Ruler,
  Shield,
  Star,
  Timer,
  Users,
  Weight,
  type LucideIcon,
} from "lucide-react";
import {
  intensityStyle,
  type StatDef,
  type StatDirection,
  type StatGroup,
} from "@/lib/stats/definitions";
import { formatStat } from "@/lib/safe";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ICONS: Record<StatDef["icon"], LucideIcon> = {
  Gauge,
  Timer,
  Shield,
  Heart,
  Crosshair,
  CircleDot,
  Ruler,
  HardHat,
  Coins,
  Star,
  Eye,
  Users,
  Weight,
};

export function StatCell({
  value,
  label,
  group,
  direction = "higher",
  unit = "",
  icon,
  min = 0,
  max = 100,
  className,
  best,
}: {
  value: number | string | null | undefined;
  label: string;
  group: StatGroup;
  direction?: StatDirection;
  unit?: string;
  icon?: StatDef["icon"];
  min?: number;
  max?: number;
  className?: string;
  best?: boolean;
}) {
  const num = typeof value === "number" ? value : null;
  let intensity = 0.35;
  if (num !== null && min !== max) {
    const t = (num - min) / (max - min);
    intensity = direction === "lower" ? 1 - t : direction === "neutral" ? 0.45 : t;
  }
  const Icon = icon ? ICONS[icon] : null;
  const display = formatStat(value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-stat text-sm tabular-nums",
            best && "ring-1 ring-brass",
            className,
          )}
          style={num !== null ? intensityStyle(group, intensity) : undefined}
        >
          {Icon ? <Icon className="size-3.5 opacity-70" aria-hidden /> : null}
          <span>
            {display}
            {display !== "--" && unit ? (
              <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span>
            ) : null}
          </span>
          {best ? <span className="sr-only">best</span> : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {direction === "lower" ? " (lower is better)" : ""}
      </TooltipContent>
    </Tooltip>
  );
}

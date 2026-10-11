import { cn } from "@/lib/utils";

export function UnitSilhouette({
  className,
  label = "Unit silhouette",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted/60",
        className,
      )}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 160 90"
        className="h-3/4 w-3/4 text-muted-foreground/50"
        aria-hidden
      >
        <rect x="20" y="40" width="110" height="28" rx="3" fill="currentColor" />
        <rect x="50" y="28" width="50" height="16" rx="2" fill="currentColor" />
        <circle cx="40" cy="72" r="10" fill="currentColor" opacity="0.7" />
        <circle cx="110" cy="72" r="10" fill="currentColor" opacity="0.7" />
        <rect x="118" y="34" width="22" height="6" rx="1" fill="currentColor" />
      </svg>
    </div>
  );
}

const ITEMS = [
  { label: "Speed / Reload", color: "#4a7c4a" },
  { label: "Armor / HP", color: "#c9a227" },
  { label: "Penetration", color: "#c0443a" },
  { label: "Caliber", color: "#c45a8a" },
  { label: "Range", color: "#3e6fa8" },
  { label: "Costs", color: "#6b6b6b" },
  { label: "Other", color: "#7a5c9e" },
];

export function ColorLegend() {
  return (
    <div
      className="flex flex-wrap gap-3 text-xs text-muted-foreground"
      aria-label="Stat color legend"
    >
      {ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
      <span className="text-muted-foreground/80">
        Reload and costs: lower is better
      </span>
    </div>
  );
}

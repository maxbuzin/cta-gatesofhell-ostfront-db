const ITEMS = [
  { label: "Speed / Reload", color: "var(--stat-green)" },
  { label: "Armor / HP", color: "var(--stat-yellow)" },
  { label: "Penetration", color: "var(--stat-red)" },
  { label: "Caliber", color: "var(--stat-pink)" },
  { label: "Range", color: "var(--stat-blue)" },
  { label: "Costs", color: "var(--stat-gray)" },
  { label: "Other", color: "var(--stat-purple)" },
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

import { Coins, HardHat } from "lucide-react";
import { InlineEdit } from "@/components/edit/inline-edit";
import { formatStat } from "@/lib/safe";

export function CostChips({
  cp,
  resources,
  editSlug = null,
}: {
  cp: number | null | undefined;
  resources: number | null | undefined;
  editSlug?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
        <HardHat className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Helmet CP</span>
        {editSlug ? (
          <InlineEdit
            label="CP"
            kind="number"
            value={cp ?? null}
            display={formatStat(cp)}
            save={{ kind: "stat", slug: editSlug, field: "cp" }}
          />
        ) : (
          formatStat(cp)
        )}
      </span>
      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-stat text-sm">
        <Coins className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Shield resources</span>
        {editSlug ? (
          <InlineEdit
            label="Resources"
            kind="number"
            value={resources ?? null}
            display={formatStat(resources)}
            save={{ kind: "stat", slug: editSlug, field: "cost" }}
          />
        ) : (
          formatStat(resources)
        )}
      </span>
    </div>
  );
}

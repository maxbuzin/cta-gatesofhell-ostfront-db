import type { Metadata } from "next";
import { getGameVersions } from "@/lib/db/queries/units";
import { EmptyState } from "@/components/units/empty-state";
import { formatStat } from "@/lib/safe";
import { safeUrl } from "@/lib/safe";
import { withQueryFallback } from "@/lib/safe-query";

export const metadata: Metadata = {
  title: "Patch Notes",
};

export default async function PatchesPage() {
  const versions = await withQueryFallback(
    () => getGameVersions(),
    [],
    "Failed to load game versions",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="page-title">Patch Notes</h1>
      {versions.length === 0 ? (
        <EmptyState
          title="No patches yet"
          description="Game version history and unit stat diffs will appear after imports."
        />
      ) : (
        <ol className="relative space-y-6 border-l border-border pl-6">
          {versions.map((v) => {
            const url = safeUrl(v.notesUrl);
            return (
              <li key={v.id} className="space-y-1">
                <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                <h2 className="font-display text-xl tracking-wide">
                  v{v.code}
                  {v.isCurrent ? (
                    <span className="ml-2 text-xs text-brass">current</span>
                  ) : null}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {v.name || "--"} · {formatStat(v.releasedAt)}
                </p>
                {url ? (
                  <a
                    href={url}
                    className="text-sm text-primary hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Official notes
                  </a>
                ) : null}
                <EmptyState title="No unit diffs for this patch yet" />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

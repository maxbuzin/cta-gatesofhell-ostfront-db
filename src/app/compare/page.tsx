import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareTable } from "@/components/compare/compare-table";
import { CompareControls } from "@/components/compare/compare-controls";
import { PenetrationChart } from "@/components/units/penetration-chart";
import { EmptyState } from "@/components/units/empty-state";
import { ColorLegend } from "@/components/units/color-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { getUnitsBySlugs } from "@/lib/db/queries/units";
import { parseCompareUnitSlugs } from "@/lib/compare-params";
import { safeCssColor } from "@/lib/safe-css-color";
import { withQueryFallback } from "@/lib/safe-query";

export const metadata: Metadata = {
  title: "Compare",
  robots: { index: false, follow: true },
};

async function CompareContent({
  searchParams,
}: {
  searchParams: Promise<{ units?: string | string[] }>;
}) {
  const sp = await searchParams;
  const slugs = parseCompareUnitSlugs(sp.units);

  const units = await withQueryFallback(
    () => getUnitsBySlugs(slugs),
    [],
    "Failed to load compare units",
  );

  if (units.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Compare</h1>
        <EmptyState
          title="No units selected"
          description="Add up to 4 units from the Units list or search, then open Compare."
        />
        <CompareControls slugs={[]} />
      </div>
    );
  }

  const compareUnits = units.map((u) => ({
    slug: u!.slug,
    name: u!.name,
    factionSlug: u!.factionSlug,
    stats: u!.stats
      ? {
          hp: u!.stats.hp,
          armorFrontMm: u!.stats.armorFrontMm,
          speedRoadKmh: u!.stats.speedRoadKmh,
          reloadS: u!.stats.reloadS,
          penetrationMm: u!.stats.penetrationMm,
          caliberMm: u!.stats.caliberMm,
          rangeM: u!.stats.rangeM,
          visionRangeM: u!.stats.visionRangeM,
          startingVeterancy: u!.stats.startingVeterancy,
        }
      : null,
    maxRangeM: u!.weapons.reduce<number | null>((max, w) => {
      if (w.maxRangeM == null) return max;
      return max == null ? w.maxRangeM : Math.max(max, w.maxRangeM);
    }, null),
    costCp: u!.costs.find((c) => c.kind === "cp")?.amount ?? null,
    costResources: u!.costs.find((c) => c.kind === "resources")?.amount ?? null,
    squadSize: u!.squadSize,
  }));

  // Index keys only (never unit slugs) so ChartStyle CSS vars stay safe.
  const series = units.map((u, i) => ({
    key: `u${i}`,
    label: u!.name,
    color: safeCssColor(
      ["#c0443a", "#b89a55", "#3e6fa8", "#7a8b5c"][i % 4],
    ),
  }));

  const rangeSet = new Set<number>();
  for (const u of units) {
    for (const p of u!.penetration) rangeSet.add(p.rangeM);
  }
  const ranges = [...rangeSet].sort((a, b) => a - b);
  const chartData = ranges.map((rangeM) => {
    const row: { rangeM: number } & Record<string, number> = { rangeM };
    for (let i = 0; i < units.length; i++) {
      const u = units[i]!;
      const pt = u.penetration.find((p) => p.rangeM === rangeM);
      if (pt) row[`u${i}`] = Number(pt.penetrationMm);
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="page-title">Compare</h1>
          <ColorLegend />
        </div>
        <CompareControls slugs={compareUnits.map((u) => u.slug)} />
      </div>
      <CompareTable units={compareUnits} />
      <section className="space-y-2">
        <h2 className="section-label">Penetration overlay</h2>
        <PenetrationChart data={chartData} series={series} />
      </section>
    </div>
  );
}

export default function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ units?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CompareContent searchParams={searchParams} />
    </Suspense>
  );
}

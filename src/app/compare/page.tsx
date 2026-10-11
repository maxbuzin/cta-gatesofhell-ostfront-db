import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareTable } from "@/components/compare/compare-table";
import { CompareControls } from "@/components/compare/compare-controls";
import { PenetrationChart } from "@/components/units/penetration-chart";
import { EmptyState } from "@/components/units/empty-state";
import { ColorLegend } from "@/components/units/color-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { getUnitsBySlugs } from "@/lib/db/queries/units";

export const metadata: Metadata = {
  title: "Compare",
  robots: { index: false, follow: true },
};

async function CompareContent({
  searchParams,
}: {
  searchParams: Promise<{ units?: string }>;
}) {
  const sp = await searchParams;
  const slugs = (sp.units || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const units = await getUnitsBySlugs(slugs);

  if (units.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
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
    costCp: u!.costs.find((c) => c.kind === "cp")?.amount ?? null,
    costResources: u!.costs.find((c) => c.kind === "resources")?.amount ?? null,
    squadSize: u!.squadSize,
  }));

  // Index keys only (never unit slugs) so ChartStyle CSS vars stay safe.
  const series = units.map((u, i) => ({
    key: `u${i}`,
    label: u!.name,
    color: ["#c0443a", "#d4a43a", "#3e6fa8", "#7a8b5c"][i % 4],
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="page-title">Compare</h1>
          <ColorLegend />
        </div>
        <CompareControls slugs={compareUnits.map((u) => u.slug)} />
      </div>
      <CompareTable units={compareUnits} />
      <section className="space-y-2">
        <h2 className="font-display text-xl tracking-wide">Penetration overlay</h2>
        <PenetrationChart data={chartData} series={series} />
      </section>
    </div>
  );
}

export default function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ units?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CompareContent searchParams={searchParams} />
    </Suspense>
  );
}

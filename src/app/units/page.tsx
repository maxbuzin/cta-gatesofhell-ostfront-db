import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterPanel } from "@/components/units/filter-panel";
import { UnitsView } from "@/components/units/units-view";
import { ColorLegend } from "@/components/units/color-legend";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFactions,
  listUnits,
} from "@/lib/db/queries/units";
import {
  normalizeUnitsParams,
  unitsSearchParamsCache,
} from "@/lib/units-params";

export const metadata: Metadata = {
  title: "Units",
};

async function UnitsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = await unitsSearchParamsCache.parse(searchParams);
  const filters = normalizeUnitsParams(parsed);
  const [factions, result] = await Promise.all([
    getFactions(),
    listUnits(filters),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 lg:w-64">
        <FilterPanel factions={factions} />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-2">
          <h1 className="page-title">Units</h1>
          <ColorLegend />
        </div>
        <UnitsView
          rows={result.rows}
          total={result.total}
          pageSize={filters.pageSize}
          nextCursor={result.nextCursor}
        />
      </div>
    </div>
  );
}

export default function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <UnitsContent searchParams={searchParams} />
    </Suspense>
  );
}

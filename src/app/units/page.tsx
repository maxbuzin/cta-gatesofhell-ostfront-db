import type { Metadata } from "next";
import { Suspense } from "react";
import { ColorLegend } from "@/components/units/color-legend";
import { UnitsBrowse } from "@/components/units/units-browse";
import { UnitsView } from "@/components/units/units-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFactions,
  listUnits,
} from "@/lib/db/queries/units";
import {
  normalizeUnitsParams,
  unitsSearchParamsCache,
} from "@/lib/units-params";
import { withQueryFallback } from "@/lib/safe-query";

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
  const emptyList = {
    rows: [] as Awaited<ReturnType<typeof listUnits>>["rows"],
    total: 0,
    nextCursor: null as string | null,
  };
  const [factions, result] = await Promise.all([
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => listUnits(filters),
      emptyList,
      "Failed to list units",
    ),
  ]);

  return (
    <UnitsBrowse factions={factions} legend={<ColorLegend />}>
      <UnitsView
        rows={result.rows}
        total={result.total}
        pageSize={filters.pageSize}
        nextCursor={result.nextCursor}
      />
    </UnitsBrowse>
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

import type { Metadata } from "next";
import { Suspense } from "react";
import { ColorLegend } from "@/components/units/color-legend";
import { UnitsBrowse } from "@/components/units/units-browse";
import { UnitsView } from "@/components/units/units-view";
import { AddNew } from "@/components/edit/add-new";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBrowseFilters,
  getFactions,
  listResearchChoices,
  listResearchSections,
  listUnits,
} from "@/lib/db/queries/units";
import { editsOpen } from "@/lib/local-edit";
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
  const emptyFilters: Awaited<ReturnType<typeof getBrowseFilters>> = {
    types: [],
    specialties: [],
    stats: {
      pen: false,
      armor: false,
      speed: false,
      range: false,
      helmet: false,
      shield: false,
    },
  };
  const editable = await editsOpen();
  const [factions, result, research, sectionRows, browseFilters] = await Promise.all([
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => listUnits(filters),
      emptyList,
      "Failed to list units",
    ),
    editable
      ? withQueryFallback(() => listResearchChoices(), [], "Failed to load research")
      : Promise.resolve([]),
    editable
      ? withQueryFallback(() => listResearchSections(), [], "Failed to load sections")
      : Promise.resolve([]),
    withQueryFallback(() => getBrowseFilters(), emptyFilters, "Failed to load filters"),
  ]);

  return (
    <UnitsBrowse
      factions={factions}
      options={browseFilters}
      legend={<ColorLegend />}
      header={
        editable ? (
          <AddNew
            factions={factions.map((row) => ({ slug: row.slug, nameEn: row.nameEn }))}
            research={research}
            sections={sectionRows}
            kinds={["unit", "faction"]}
          />
        ) : null
      }
    >
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

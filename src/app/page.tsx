import Link from "next/link";
import {
  Bomb,
  BrickWall,
  Car,
  Container,
  Focus,
  Radar,
  Rocket,
  Target,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getFactions,
  getPopularComparisons,
  getSourcesList,
  getUnitCountsByType,
} from "@/lib/db/queries/units";
import { EmptyState } from "@/components/units/empty-state";
import { FACTIONS, FACTION_COLORS } from "@/lib/factions";
import { safeCssColor } from "@/lib/safe-css-color";
import { FactionChips } from "@/components/layout/faction-chips";
import { FanNotice } from "@/components/home/fan-notice";
import { HomeSearch } from "@/components/home/home-search";
import { withQueryFallback } from "@/lib/safe-query";

const TYPE_ICONS: Record<string, LucideIcon> = {
  tank: Container,
  tank_destroyer: Target,
  spg: Target,
  armored_car: Car,
  light_vehicle: Car,
  support_vehicle: Truck,
  truck: Truck,
  at_gun: Focus,
  aa_gun: Radar,
  artillery: Bomb,
  mortar: Rocket,
  rocket: Rocket,
  mg_emplacement: BrickWall,
  infantry_squad: Users,
  infantry_unit: Users,
};

const TILES = [
  { code: "tank", label: "Tanks" },
  { code: "tank_destroyer", label: "Tank Destroyers & SPG" },
  { code: "armored_car", label: "Armored Cars & Light Vehicles" },
  { code: "support_vehicle", label: "Support Vehicles & Trucks" },
  { code: "at_gun", label: "AT Guns" },
  { code: "aa_gun", label: "AA Guns" },
  { code: "artillery", label: "Artillery" },
  { code: "mortar", label: "Mortars & Rockets" },
  { code: "mg_emplacement", label: "MG Emplacements" },
  { code: "infantry_squad", label: "Infantry" },
] as const;

function formatUpdated(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = date.toLocaleString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

function newestUpdated(sources: { retrievedAt: Date | string | null }[]) {
  let best: Date | string | null = null;
  let bestTime = -1;
  for (const source of sources) {
    const time = new Date(source.retrievedAt ?? "").getTime();
    if (Number.isNaN(time) || time <= bestTime) continue;
    bestTime = time;
    best = source.retrievedAt;
  }
  return formatUpdated(best);
}

export default async function HomePage() {
  const [counts, factions, popular, sources] = await Promise.all([
    withQueryFallback(
      () => getUnitCountsByType(),
      [],
      "Failed to load unit type counts",
    ),
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => getPopularComparisons(),
      [],
      "Failed to load popular comparisons",
    ),
    withQueryFallback(() => getSourcesList(), [], "Failed to load sources"),
  ]);

  const countMap = new Map(counts.map((c) => [c.code, c]));
  const tiles = TILES.map((tile) => ({
    ...tile,
    count: countMap.get(tile.code)?.count ?? 0,
    label: countMap.get(tile.code)?.nameEn || tile.label,
  }));

  return (
    <div className="space-y-8">
      <FanNotice updated={newestUpdated(sources)} />
      <section className="relative overflow-hidden rounded-md border border-border bg-surface px-4 py-8 md:px-10 md:py-10">
        <div className="relative z-10 mx-auto max-w-2xl space-y-5 text-center">
          <p className="font-display text-4xl tracking-wider text-foreground md:text-5xl">
            OSTFRONT DB
          </p>
          <p className="text-muted-foreground">
            Turbo spreadsheet for Call to Arms – Gates of Hell: Ostfront. Search
            units, compare stats, explore Conquest research.
          </p>
          <HomeSearch />
          {factions.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {factions.map((f) => (
                <Link
                  key={f.slug}
                  href={`/units?faction=${f.slug}`}
                  className="hit-row inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-150 hover:border-primary"
                >
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: safeCssColor(
                        f.color || FACTION_COLORS[f.slug],
                      ),
                    }}
                    aria-hidden
                  />
                  {FACTIONS.find((d) => d.slug === f.slug)?.nameEn || f.nameEn}
                </Link>
              ))}
            </div>
          ) : (
            <FactionChips className="justify-center pt-2" size="md" />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Categories</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {tiles.map((tile) => {
            const Icon = TYPE_ICONS[tile.code] || Container;
            return (
              <Link
                key={tile.code}
                href={`/units?type=${tile.code}`}
                className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 transition-colors duration-150 hover:border-primary/50"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-medium">{tile.label}</span>
                <span className="font-stat text-xs text-muted-foreground">
                  {tile.count} units
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">Popular comparisons</h2>
        {popular.length === 0 ? (
          <EmptyState
            title="No popular comparisons yet"
            description="Featured matchups will show here once data is curated."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {popular.map((p) => (
              <Link
                key={p.id}
                href={`/compare?units=${(p.unitSlugs ?? []).join(",")}`}
                className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                {p.title}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

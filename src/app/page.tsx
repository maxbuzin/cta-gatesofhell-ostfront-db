import Link from "next/link";
import {
  Bomb,
  Car,
  Crosshair,
  Radar,
  Rocket,
  Target,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getCurrentGameVersion,
  getFactions,
  getPopularComparisons,
  getUnitCountsByType,
} from "@/lib/db/queries/units";
import { EmptyState } from "@/components/units/empty-state";
import { FACTION_COLORS } from "@/lib/stats/definitions";
import { HomeSearch } from "@/components/home/home-search";

const TYPE_ICONS: Record<string, LucideIcon> = {
  tank: Crosshair,
  tank_destroyer: Target,
  spg: Target,
  armored_car: Car,
  light_vehicle: Car,
  support_vehicle: Truck,
  truck: Truck,
  at_gun: Crosshair,
  aa_gun: Radar,
  artillery: Bomb,
  mortar: Rocket,
  rocket: Rocket,
  mg_emplacement: Crosshair,
  infantry_squad: Users,
  infantry_unit: Users,
};

const TILE_ORDER = [
  "tank",
  "tank_destroyer",
  "armored_car",
  "support_vehicle",
  "at_gun",
  "aa_gun",
  "artillery",
  "mortar",
  "mg_emplacement",
  "infantry_squad",
];

export default async function HomePage() {
  const [counts, factions, popular, version] = await Promise.all([
    getUnitCountsByType(),
    getFactions(),
    getPopularComparisons(),
    getCurrentGameVersion(),
  ]);

  const countMap = new Map(counts.map((c) => [c.code, c]));
  const tiles = TILE_ORDER.map((code) => {
    const row = countMap.get(code);
    return {
      code,
      label:
        row?.nameEn ||
        code
          .split("_")
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" "),
      count: row?.count ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section className="relative overflow-hidden rounded-md border border-border bg-surface paper-grain px-4 py-12 md:px-10 md:py-16">
        <div className="relative z-10 mx-auto max-w-2xl space-y-5 text-center">
          <p className="font-display text-4xl tracking-wider text-foreground md:text-5xl">
            OSTFRONT DB
          </p>
          <p className="text-muted-foreground">
            Turbo spreadsheet for Call to Arms – Gates of Hell: Ostfront. Search
            units, compare stats, explore Conquest research.
          </p>
          <HomeSearch />
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {(factions.length
              ? factions
              : Object.entries(FACTION_COLORS).map(([slug, color]) => ({
                  slug,
                  nameEn: slug,
                  color,
                }))
            ).map((f) => (
              <Link
                key={f.slug}
                href={`/units?faction=${f.slug}`}
                className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-150 hover:border-primary"
                style={{
                  borderColor: f.color || FACTION_COLORS[f.slug],
                }}
              >
                {f.nameEn}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="page-title text-2xl md:text-3xl">Categories</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map((tile) => {
            const Icon = TYPE_ICONS[tile.code] || Crosshair;
            return (
              <Link
                key={tile.code}
                href={`/units?type=${tile.code}`}
                className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/50"
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

      <section className="space-y-4">
        <h2 className="page-title text-2xl md:text-3xl">Popular comparisons</h2>
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

      <section className="space-y-4">
        <h2 className="page-title text-2xl md:text-3xl">Latest patch</h2>
        {!version ? (
          <EmptyState
            title="No patch data yet"
            description="The current game version will appear after the first import."
          />
        ) : (
          <div className="rounded-md border border-border bg-card p-4">
            <p className="font-display text-xl">Game v{version.code}</p>
            <p className="text-sm text-muted-foreground">
              {version.name || "--"} · Released {version.releasedAt || "--"}
            </p>
            <Link
              href="/patches"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              View patch notes
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

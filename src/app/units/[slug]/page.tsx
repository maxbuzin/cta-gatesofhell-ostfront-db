import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyLinkButton } from "@/components/units/copy-link-button";
import { AddCompareButton } from "@/components/units/add-compare-button";
import { FactionBadge } from "@/components/units/faction-badge";
import { SpecialtyBadge } from "@/components/units/specialty-badge";
import { CostChips } from "@/components/units/cost-chips";
import { StatCell } from "@/components/units/stat-cell";
import { UnitSilhouette } from "@/components/units/unit-silhouette";
import { ArmorDiagram } from "@/components/units/armor-diagram";
import { PenetrationChart } from "@/components/units/penetration-chart";
import { EmptyState } from "@/components/units/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { z } from "zod";
import { InlineEdit } from "@/components/edit/inline-edit";
import { getUnitBySlug, getUnitUnlock } from "@/lib/db/queries/units";
import { editsOpen } from "@/lib/local-edit";
import { formatStat } from "@/lib/safe";
import { ColorLegend } from "@/components/units/color-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { withQueryFallback } from "@/lib/safe-query";
import { safeCssColor } from "@/lib/safe-css-color";

const unitSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

const AMMO_TOOLTIPS: Record<string, string> = {
  AP: "Armor-piercing solid shot.",
  APCR: "Armor-piercing composite rigid; high velocity.",
  "APC-HE": "Armor-piercing capped with HE filler.",
  APHE: "Armor-piercing high explosive.",
  HEAT: "High-explosive anti-tank shaped charge.",
  HE: "High explosive for soft targets.",
  WP: "White phosphorus smoke/incendiary.",
  Smoke: "Smoke screening round.",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Placeholder for Cache Components validation; unknown slugs still 404 at runtime.
  return [{ slug: "placeholder" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!unitSlugSchema.safeParse(slug).success) {
    return { title: "Unit not found" };
  }
  const unit = await withQueryFallback(
    () => getUnitBySlug(slug),
    null,
    "Failed to load unit metadata",
  );
  if (!unit) return { title: "Unit not found" };
  return {
    title: `${unit.name} – ${unit.factionName} ${unit.typeName}`,
    description:
      unit.descriptionEn?.slice(0, 160) || `${unit.name} stats on Ostfront DB`,
  };
}

async function UnitDetailContent({ params }: Props) {
  const { slug } = await params;
  if (!unitSlugSchema.safeParse(slug).success) notFound();
  const [unit, unlock] = await Promise.all([
    withQueryFallback(() => getUnitBySlug(slug), null, "Failed to load unit"),
    withQueryFallback(
      () => getUnitUnlock(slug),
      null,
      "Failed to load unlock path",
    ),
  ]);
  if (!unit) notFound();
  const editable = await editsOpen();
  const statEdit = (field: "armor" | "speed" | "reload" | "penetration" | "cp") =>
    editable ? { slug: unit.slug, field } : null;

  const cp = unit.costs.find((c) => c.kind === "cp")?.amount ?? null;
  const resources =
    unit.costs.find((c) => c.kind === "resources")?.amount ?? null;

  const penByAmmo = new Map<
    number,
    { name: string; points: { rangeM: number; mm: number }[] }
  >();
  for (const p of unit.penetration) {
    const ammo = unit.weapons
      .flatMap((w) => w.ammo)
      .find((a) => a.ammoId === p.ammoTypeId);
    const name = ammo?.ammoName ?? `ammo-${p.ammoTypeId}`;
    const cur = penByAmmo.get(p.ammoTypeId) ?? { name, points: [] };
    cur.points.push({ rangeM: p.rangeM, mm: Number(p.penetrationMm) });
    penByAmmo.set(p.ammoTypeId, cur);
  }

  const ranges = [
    ...new Set(
      [...penByAmmo.values()].flatMap((a) => a.points.map((p) => p.rangeM)),
    ),
  ].sort((a, b) => a - b);

  // Index keys only (u0, u1, …) — ChartStyle allowlists /^u[0-9]+$/.
  const ammoEntries = [...penByAmmo.entries()];
  const chartData = ranges.map((rangeM) => {
    const row: { rangeM: number } & Record<string, number> = { rangeM };
    ammoEntries.forEach(([, ammo], i) => {
      const pt = ammo.points.find((p) => p.rangeM === rangeM);
      if (pt) row[`u${i}`] = pt.mm;
    });
    return row;
  });

  const series = ammoEntries.map(([, ammo], i) => ({
    key: `u${i}`,
    label: ammo.name,
    color: safeCssColor(
      ["#c0443a", "#b89a55", "#3e6fa8", "#7a8b5c"][i % 4],
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <UnitSilhouette
          className="rounded-md border border-border"
          label={unit.name}
        />
        <div className="space-y-3">
          <h1 className="page-title">
            {editable ? (
              <InlineEdit
                label="Name"
                kind="text"
                value={unit.name}
                save={{ kind: "stat", slug: unit.slug, field: "name" }}
              />
            ) : (
              unit.name
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <FactionBadge
              slug={unit.factionSlug}
              name={unit.factionName}
              color={unit.factionColor}
            />
            <span className="text-sm text-muted-foreground">{unit.typeName}</span>
            {unit.specialties.map((s) => (
              <SpecialtyBadge key={s.slug} name={s.nameEn} />
            ))}
          </div>
          <CostChips
            cp={cp}
            resources={resources}
            editSlug={editable ? unit.slug : null}
          />
          <div className="flex flex-wrap gap-2">
            <AddCompareButton
              slug={unit.slug}
              name={unit.name}
              factionSlug={unit.factionSlug}
            />
            <CopyLinkButton />
          </div>
          <ColorLegend />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="weapons">Weapons & Ammo</TabsTrigger>
            <TabsTrigger value="penetration">Penetration chart</TabsTrigger>
            <TabsTrigger value="armor">Armor</TabsTrigger>
            <TabsTrigger value="unlock">Unlock path</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              <StatCell value={unit.stats?.hp} label="HP" group="yellow" icon="Heart" />
              <StatCell value={unit.stats?.armorFrontMm} label="Armor" group="yellow" icon="Shield" unit="mm" edit={statEdit("armor")} />
              <StatCell value={unit.stats?.speedRoadKmh} label="Speed" group="green" icon="Gauge" unit="km/h" edit={statEdit("speed")} />
              <StatCell value={unit.stats?.reloadS} label="Reload" group="green" icon="Timer" unit="s" direction="lower" edit={statEdit("reload")} />
              <StatCell value={unit.stats?.penetrationMm} label="Penetration" group="red" icon="Crosshair" unit="mm" edit={statEdit("penetration")} />
              <StatCell value={cp} label="CP" group="gray" icon="HardHat" direction="lower" edit={statEdit("cp")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-medium">Best at</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {(unit.bestAt || "")
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  {!unit.bestAt ? <li>--</li> : null}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-medium">Weak against</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {(unit.weakAgainst || "")
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  {!unit.weakAgainst ? <li>--</li> : null}
                </ul>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {unit.descriptionEn || "--"}
            </p>
          </TabsContent>

          <TabsContent value="weapons" className="pt-4">
            {unit.weapons.length === 0 ? (
              <EmptyState title="No weapons yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Weapon</TableHead>
                    <TableHead>Caliber</TableHead>
                    <TableHead>Ammo</TableHead>
                    <TableHead>Reload</TableHead>
                    <TableHead>Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unit.weapons.map((w) => (
                    <TableRow key={`${w.weaponId}-${w.mount}`}>
                      <TableCell>{w.name}</TableCell>
                      <TableCell className="font-stat">
                        {formatStat(w.caliberMm)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {w.ammo.map((a) => (
                            <Tooltip key={a.ammoId}>
                              <TooltipTrigger asChild>
                                <span className="rounded border border-border px-1.5 py-0.5 text-xs">
                                  {a.kind}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {AMMO_TOOLTIPS[a.kind] || a.ammoName}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {w.ammo.length === 0 ? "--" : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-stat">
                        {formatStat(w.reloadS)}
                      </TableCell>
                      <TableCell className="font-stat">
                        {formatStat(w.maxRangeM)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="penetration" className="pt-4">
            <PenetrationChart data={chartData} series={series} />
          </TabsContent>

          <TabsContent value="armor" className="pt-4">
            {unit.category === "vehicle" || unit.category === "gun" ? (
              <ArmorDiagram
                front={unit.stats?.armorFrontMm}
                side={unit.stats?.armorSideMm}
                rear={unit.stats?.armorRearMm}
                top={unit.stats?.armorTopMm}
              />
            ) : (
              <EmptyState title="No armor diagram for this unit type" />
            )}
          </TabsContent>

          <TabsContent value="unlock" className="space-y-3 pt-4">
            {unlock ? (
              <ol className="space-y-2 text-sm">
                {unlock.steps.map((step, index) => (
                  <li
                    key={step.slug}
                    className="flex items-baseline justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span>
                      <span className="text-muted-foreground">{index + 1}. </span>
                      {step.name}
                    </span>
                    <span className="font-stat text-muted-foreground">
                      {step.researchCost ?? "--"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No research entry"
                description="This unit is not on the Conquest research tree."
              />
            )}
            <Link
              href={`/research/${unit.factionSlug}?unit=${unit.slug}`}
              className="text-sm text-primary hover:underline"
            >
              Open {unit.factionName} research tree
            </Link>
          </TabsContent>

          <TabsContent value="sources" className="pt-4">
            <EmptyState
              title="No sources linked yet"
              description="Source citations for this unit will appear after import."
            />
            <p className="mt-3 text-sm">
              <a
                href={`https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/issues/new?title=${encodeURIComponent(`Data: ${unit.name}`)}`}
                className="text-primary hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Report wrong data
              </a>
            </p>
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <div className="rounded-md border border-border p-4">
            <h2 className="mb-2 font-medium">Similar units</h2>
            <EmptyState title="No similar units yet" />
          </div>
          <div className="rounded-md border border-border p-4">
            <h2 className="mb-2 font-medium">Counters</h2>
            <EmptyState title="No counters yet" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function UnitDetailPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <UnitDetailContent {...props} />
    </Suspense>
  );
}

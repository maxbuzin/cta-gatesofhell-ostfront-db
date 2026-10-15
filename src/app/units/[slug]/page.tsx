import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyLinkButton } from "@/components/units/copy-link-button";
import { AddCompareButton } from "@/components/units/add-compare-button";
import { FactionBadge } from "@/components/units/faction-badge";
import { SpecialtyBadge } from "@/components/units/specialty-badge";
import { UnitPicture } from "@/components/units/unit-picture";
import {
  UnitCosts,
  UnitEditActions,
  UnitEditError,
  UnitEditProvider,
  UnitOverview,
  UnitTitle,
  UnitTypeChip,
} from "@/components/units/unit-edit";
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
import { DeleteUnit } from "@/components/edit/delete-unit";
import { getUnitBySlug, getUnitTypes, getUnitUnlock } from "@/lib/db/queries/units";
import { editsOpen } from "@/lib/local-edit";
import { formatStat } from "@/lib/safe";
import { toUnitFacts } from "@/lib/unit-facts";
import { ColorLegend } from "@/components/units/color-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { withQueryFallback } from "@/lib/safe-query";
import { safeCssColor } from "@/lib/safe-css-color";
import { publicImageUrl, researchImageRel, unitImageRel } from "@/lib/public-image";
import { ammoDraftFrom, isTypeCategory, type TypeChoice } from "@/lib/unit-loadout";
import { ContentCrumbs } from "@/components/layout/content-crumbs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  const [unit, unlock, types] = await Promise.all([
    withQueryFallback(() => getUnitBySlug(slug), null, "Failed to load unit"),
    withQueryFallback(
      () => getUnitUnlock(slug),
      null,
      "Failed to load unlock path",
    ),
    withQueryFallback(() => getUnitTypes(), [], "Failed to load unit types"),
  ]);
  if (!unit) notFound();
  const editable = await editsOpen();

  const facts = toUnitFacts(unit);
  const ranges = [
    ...new Set(facts.penetration.flatMap((ammo) => ammo.points.map((point) => point.rangeM))),
  ].sort((a, b) => a - b);

  // Index keys only (u0, u1, …). ChartStyle allowlists /^u[0-9]+$/.
  const chartData = ranges.map((rangeM) => {
    const row: { rangeM: number } & Record<string, number> = { rangeM };
    facts.penetration.forEach((ammo, index) => {
      const point = ammo.points.find((item) => item.rangeM === rangeM);
      if (point) row[`u${index}`] = point.mm;
    });
    return row;
  });

  const series = facts.penetration.map((ammo, i) => ({
    key: `u${i}`,
    label: ammo.name,
    color: safeCssColor(["#c0443a", "#b89a55", "#3e6fa8", "#7a8b5c"][i % 4]),
  }));
  const picture =
    publicImageUrl(unitImageRel(unit.factionSlug, unit.slug)) ||
    (unlock?.researchSlug
      ? publicImageUrl(researchImageRel(unit.factionSlug, unlock.researchSlug))
      : null) ||
    publicImageUrl(researchImageRel(unit.factionSlug, unit.slug));
  const category = isTypeCategory(unit.category) ? unit.category : "infantry";
  const type: TypeChoice = {
    code: unit.typeCode,
    name: unit.typeName,
    category,
    fresh: false,
  };
  const profile = {
    name: unit.name,
    hp: facts.hp,
    armor: facts.armor,
    speed: facts.speed,
    reload: facts.reload,
    penetration: unit.stats?.penetrationMm ?? null,
    cp: facts.cp,
    cost: facts.cost,
    bestAt: unit.bestAt,
    weakAgainst: unit.weakAgainst,
    description: unit.descriptionEn,
  };

  return (
    <UnitEditProvider
      slug={unit.slug}
      editable={editable}
      profile={profile}
      type={type}
      ammo={ammoDraftFrom(facts.penetration)}
    >
    <div className="space-y-6">
      <ContentCrumbs>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/units">Units</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/units?faction=${unit.factionSlug}`}>{unit.factionName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{unit.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ContentCrumbs>
      <div className="flex flex-col gap-4 sm:flex-row">
        <UnitPicture src={picture} alt={unit.name} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <UnitTitle />
            <UnitEditActions />
            {editable ? <DeleteUnit slug={unit.slug} /> : null}
          </div>
          <UnitEditError />
          <div className="flex flex-wrap items-center gap-2">
            <FactionBadge
              slug={unit.factionSlug}
              name={unit.factionName}
              color={unit.factionColor}
            />
            <UnitTypeChip types={types} />
            {unit.specialties.map((s) => (
              <SpecialtyBadge key={s.slug} name={s.nameEn} />
            ))}
          </div>
          <UnitCosts />
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
        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList className="w-full justify-start overflow-x-auto [&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="weapons">Weapons & Ammo</TabsTrigger>
            <TabsTrigger value="penetration">Penetration chart</TabsTrigger>
            <TabsTrigger value="armor">Armor</TabsTrigger>
            <TabsTrigger value="unlock">Unlock path</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-4">
            <UnitOverview facts={facts} />
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
    </UnitEditProvider>
  );
}

export default function UnitDetailPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <UnitDetailContent {...props} />
    </Suspense>
  );
}

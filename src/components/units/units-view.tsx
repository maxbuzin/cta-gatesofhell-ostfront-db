"use client";

import Link from "next/link";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { LayoutGrid, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FactionBadge } from "@/components/units/faction-badge";
import { SpecialtyBadge } from "@/components/units/specialty-badge";
import { StatCell } from "@/components/units/stat-cell";
import { UnitSilhouette } from "@/components/units/unit-silhouette";
import { AddCompareButton } from "@/components/units/add-compare-button";
import { EmptyState } from "@/components/units/empty-state";
import { formatStat } from "@/lib/safe";

export type UnitListRow = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  tier: number | null;
  notes: string | null;
  squadSize: number | null;
  factionSlug: string;
  factionName: string;
  factionColor: string | null;
  typeCode: string;
  typeName: string;
  category: string;
  hp: number | null;
  armorFrontMm: number | null;
  speedRoadKmh: number | null;
  reloadS: number | null;
  penetrationMm: number | null;
  caliberMm: number | null;
  rangeM: number | null;
  startingVeterancy: number | null;
  visionRangeM: number | null;
  hpPerSoldier: number | null;
  rifles: number | null;
  semiAuto: number | null;
  smgs: number | null;
  mgs: number | null;
  atWeapons: number | null;
  sniperRifles: number | null;
  costCp: number | null;
  costResources: number | null;
  specialties: { slug: string; nameEn: string }[];
};

export function UnitsView({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: UnitListRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(["table", "cards"] as const).withDefault("table"),
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No units yet"
        description="Unit data will appear here after the ETL import. Filters and search are ready."
      />
    );
  }

  const isInfantry = rows.every((r) => r.category === "infantry");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-stat text-sm text-muted-foreground">
          {total} unit{total === 1 ? "" : "s"}
          {total > pageSize
            ? ` · page ${page} of ${Math.ceil(total / pageSize)}`
            : ""}
        </p>
        <div className="flex gap-1">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            <TableIcon className="size-4" />
            Table
          </Button>
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
          >
            <LayoutGrid className="size-4" />
            Cards
          </Button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((unit) => (
            <article
              key={unit.slug}
              className="overflow-hidden rounded-md border border-border bg-card transition-colors duration-150 hover:border-primary/40"
            >
              <UnitSilhouette label={`${unit.name} silhouette`} />
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/units/${unit.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {unit.name}
                  </Link>
                  <AddCompareButton
                    slug={unit.slug}
                    name={unit.name}
                    factionSlug={unit.factionSlug}
                    mode="checkbox"
                  />
                </div>
                <FactionBadge
                  slug={unit.factionSlug}
                  name={unit.factionName}
                  color={unit.factionColor}
                />
                <div className="flex flex-wrap gap-1">
                  {unit.specialties.map((s) => (
                    <SpecialtyBadge key={s.slug} name={s.nameEn} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <StatCell value={unit.armorFrontMm} label="Armor" group="yellow" icon="Shield" unit="mm" />
                  <StatCell value={unit.hp} label="HP" group="yellow" icon="Heart" />
                  <StatCell value={unit.speedRoadKmh} label="Speed" group="green" icon="Gauge" unit="km/h" />
                  <StatCell value={unit.penetrationMm} label="Pen" group="red" icon="Crosshair" unit="mm" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="sticky left-0 z-10 bg-muted/40">Compare</TableHead>
                <TableHead className="sticky left-16 z-10 bg-muted/40">Unit</TableHead>
                <TableHead>Faction</TableHead>
                {isInfantry ? (
                  <>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Helmet</TableHead>
                    <TableHead>Shield</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Vet</TableHead>
                    <TableHead>HP/soldier</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>LoS</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Class</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Helmet</TableHead>
                    <TableHead>Shield</TableHead>
                    <TableHead>Armor</TableHead>
                    <TableHead>HP</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Reload</TableHead>
                    <TableHead>Pen</TableHead>
                    <TableHead>Caliber</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Vet</TableHead>
                  </>
                )}
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((unit, i) => (
                <TableRow
                  key={unit.slug}
                  className={i % 2 === 1 ? "bg-muted/20" : undefined}
                >
                  <TableCell className="sticky left-0 bg-inherit">
                    <AddCompareButton
                      slug={unit.slug}
                      name={unit.name}
                      factionSlug={unit.factionSlug}
                      mode="checkbox"
                    />
                  </TableCell>
                  <TableCell className="sticky left-16 bg-inherit font-medium">
                    <Link href={`/units/${unit.slug}`} className="hover:text-primary">
                      {unit.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <FactionBadge
                      slug={unit.factionSlug}
                      name={unit.factionName}
                      color={unit.factionColor}
                    />
                  </TableCell>
                  {isInfantry ? (
                    <>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unit.specialties.map((s) => (
                            <SpecialtyBadge key={s.slug} name={s.nameEn} />
                          ))}
                          {unit.specialties.length === 0 ? "--" : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-stat">{formatStat(unit.costCp)}</TableCell>
                      <TableCell className="font-stat">{formatStat(unit.costResources)}</TableCell>
                      <TableCell className="font-stat">{formatStat(unit.tier)}</TableCell>
                      <TableCell>
                        <StatCell value={unit.startingVeterancy} label="Vet" group="purple" icon="Star" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.hpPerSoldier} label="HP/soldier" group="yellow" icon="Heart" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.squadSize} label="Squad" group="purple" icon="Users" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.visionRangeM} label="LoS" group="blue" icon="Eye" unit="m" />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{unit.typeName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unit.specialties.map((s) => (
                            <SpecialtyBadge key={s.slug} name={s.nameEn} />
                          ))}
                          {unit.specialties.length === 0 ? "--" : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.costCp} label="CP" group="gray" icon="HardHat" direction="lower" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.costResources} label="Resources" group="gray" icon="Coins" direction="lower" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.armorFrontMm} label="Armor" group="yellow" icon="Shield" unit="mm" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.hp} label="HP" group="yellow" icon="Heart" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.speedRoadKmh} label="Speed" group="green" icon="Gauge" unit="km/h" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.reloadS} label="Reload" group="green" icon="Timer" unit="s" direction="lower" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.penetrationMm} label="Pen" group="red" icon="Crosshair" unit="mm" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.caliberMm} label="Caliber" group="pink" icon="CircleDot" unit="mm" direction="higher" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.rangeM} label="Range" group="blue" icon="Ruler" unit="m" />
                      </TableCell>
                      <TableCell>
                        <StatCell value={unit.startingVeterancy} label="Vet" group="purple" icon="Star" />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {unit.notes || "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { FactionBadge } from "@/components/units/faction-badge";
import { AddCompareButton } from "@/components/units/add-compare-button";

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

type StatItem = {
  label: string;
  value: number | null;
  unit?: string;
  tone: string;
};

function formatValue(value: number, unit?: string) {
  if (!unit) return String(value);
  if (unit === "s") return `${value}s`;
  return `${value} ${unit}`;
}

function statsFor(unit: UnitListRow) {
  const items: StatItem[] =
    unit.category === "infantry"
      ? [
          { label: "CP", value: unit.costCp, tone: "text-stat-gray" },
          { label: "Resources", value: unit.costResources, tone: "text-stat-gray" },
          { label: "Tier", value: unit.tier, tone: "text-stat-purple" },
          { label: "Vet", value: unit.startingVeterancy, tone: "text-stat-purple" },
          { label: "HP/soldier", value: unit.hpPerSoldier, tone: "text-stat-purple" },
          { label: "Squad", value: unit.squadSize, tone: "text-stat-purple" },
          { label: "Line of sight", value: unit.visionRangeM, unit: "m", tone: "text-stat-blue" },
        ]
      : [
          { label: "CP", value: unit.costCp, tone: "text-stat-gray" },
          { label: "Resources", value: unit.costResources, tone: "text-stat-gray" },
          { label: "Armor", value: unit.armorFrontMm, unit: "mm", tone: "text-stat-yellow" },
          { label: "HP", value: unit.hp, tone: "text-stat-yellow" },
          { label: "Speed", value: unit.speedRoadKmh, unit: "km/h", tone: "text-stat-green" },
          { label: "Reload", value: unit.reloadS, unit: "s", tone: "text-stat-green" },
          { label: "Pen", value: unit.penetrationMm, unit: "mm", tone: "text-[#dc6e66]" },
          { label: "Caliber", value: unit.caliberMm, unit: "mm", tone: "text-stat-pink" },
          { label: "Range", value: unit.rangeM, unit: "m", tone: "text-stat-blue" },
          { label: "Vet", value: unit.startingVeterancy, tone: "text-stat-purple" },
        ];
  return items.filter(
    (item): item is StatItem & { value: number } => item.value !== null,
  );
}

function UnitStats({ unit }: { unit: UnitListRow }) {
  const stats = statsFor(unit);
  if (stats.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-3 text-sm">
      {stats.map((stat) => (
        <span key={stat.label} className={stat.tone}>
          {stat.label}{" "}
          <span className="font-stat tabular-nums">
            {formatValue(stat.value, stat.unit)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function UnitCard({ unit }: { unit: UnitListRow }) {
  const notes = unit.notes?.trim();
  const specialties = unit.specialties.map((s) => s.nameEn).join(" · ");

  return (
    <article className="flex w-full min-w-0 flex-col gap-5 overflow-hidden rounded-md border border-border bg-card p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <AddCompareButton
            slug={unit.slug}
            name={unit.name}
            factionSlug={unit.factionSlug}
            mode="checkbox"
          />
          <Link
            href={`/units/${unit.slug}`}
            className="max-w-full min-w-0 break-words font-medium hover:text-primary"
          >
            {unit.name}
          </Link>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <FactionBadge
            slug={unit.factionSlug}
            name={unit.factionName}
            color={unit.factionColor}
          />
          <span className="text-sm text-muted-foreground">{unit.typeName}</span>
        </div>
      </div>
      {specialties ? (
        <p className="text-sm text-muted-foreground">{specialties}</p>
      ) : null}
      <UnitStats unit={unit} />
      {notes ? (
        <p className="line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
          {notes}
        </p>
      ) : null}
    </article>
  );
}

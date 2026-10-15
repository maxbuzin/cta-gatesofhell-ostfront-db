"use client";

import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FACTION_COLORS } from "@/lib/factions";
import { safeCssColor } from "@/lib/safe-css-color";

const SPECIALTIES = [
  { slug: "anti-tank", name: "Anti-Tank" },
  { slug: "anti-infantry", name: "Anti-Infantry" },
  { slug: "assault", name: "Attack / Assault" },
  { slug: "defense", name: "Defense / Hold Line" },
  { slug: "recon", name: "Recon / Spotting" },
  { slug: "support", name: "Support" },
  { slug: "artillery", name: "Artillery" },
  { slug: "anti-air", name: "Anti-Air" },
  { slug: "transport", name: "Transport" },
];

const TYPES = [
  { code: "tank", name: "Tank" },
  { code: "tank_destroyer", name: "Tank Destroyer" },
  { code: "spg", name: "SPG" },
  { code: "armored_car", name: "Armored Car" },
  { code: "light_vehicle", name: "Light Vehicle" },
  { code: "support_vehicle", name: "Support Vehicle" },
  { code: "truck", name: "Truck" },
  { code: "at_gun", name: "AT Gun" },
  { code: "aa_gun", name: "AA Gun" },
  { code: "artillery", name: "Artillery" },
  { code: "mortar", name: "Mortar" },
  { code: "rocket", name: "Rocket" },
  { code: "mg_emplacement", name: "MG Emplacement" },
  { code: "infantry_squad", name: "Infantry" },
];

export type FactionOpt = { slug: string; nameEn: string; color: string | null };

function byLabel<T>(label: (item: T) => string) {
  return (a: T, b: T) =>
    label(a).localeCompare(label(b), "en", { sensitivity: "base" });
}

const unitFilterParsers = {
  q: parseAsString.withDefault(""),
  faction: parseAsArrayOf(parseAsString).withDefault([]),
  type: parseAsArrayOf(parseAsString).withDefault([]),
  specialty: parseAsArrayOf(parseAsString).withDefault([]),
  penMin: parseAsInteger,
  penMax: parseAsInteger,
  armorMin: parseAsInteger,
  armorMax: parseAsInteger,
  speedMin: parseAsInteger,
  speedMax: parseAsInteger,
  rangeMin: parseAsInteger,
  rangeMax: parseAsInteger,
  helmetMin: parseAsInteger,
  helmetMax: parseAsInteger,
  shieldMin: parseAsInteger,
  shieldMax: parseAsInteger,
  tier: parseAsArrayOf(parseAsInteger).withDefault([]),
  cursor: parseAsString,
};

export function useUnitFilters() {
  return useQueryStates(unitFilterParsers, {
    history: "replace",
    shallow: false,
  });
}

export function countActiveFilters(params: {
  q: string;
  faction: string[];
  type: string[];
  specialty: string[];
  tier: number[];
  penMin: number | null;
  penMax: number | null;
  armorMin: number | null;
  armorMax: number | null;
  speedMin: number | null;
  speedMax: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  helmetMin: number | null;
  helmetMax: number | null;
  shieldMin: number | null;
  shieldMax: number | null;
}) {
  const ranges = [
    params.penMin,
    params.penMax,
    params.armorMin,
    params.armorMax,
    params.speedMin,
    params.speedMax,
    params.rangeMin,
    params.rangeMax,
    params.helmetMin,
    params.helmetMax,
    params.shieldMin,
    params.shieldMax,
  ].filter((value) => value !== null).length;

  return (
    (params.q.trim() ? 1 : 0) +
    params.faction.length +
    params.type.length +
    params.specialty.length +
    params.tier.length +
    ranges
  );
}

export type BrowseFilterOptions = {
  types: { code: string; nameEn: string }[];
  specialties: { slug: string; nameEn: string }[];
  stats: {
    pen: boolean;
    armor: boolean;
    speed: boolean;
    range: boolean;
    helmet: boolean;
    shield: boolean;
  };
};

export function FilterPanel({
  factions,
  options,
}: {
  factions: FactionOpt[];
  options: BrowseFilterOptions;
}) {
  const [params, setParams] = useUnitFilters();

  const toggle = (key: "faction" | "type" | "specialty", value: string) => {
    const cur = params[key];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    void setParams({ [key]: next, cursor: null });
  };

  const factionOpts = factions
    .map((f) => ({
      slug: f.slug,
      nameEn: f.nameEn,
      color: f.color,
    }))
    .sort(byLabel((f) => f.nameEn));

  const typeNames = new Map(TYPES.map((type) => [type.code, type.name]));
  const typeOpts = options.types
    .map((type) => ({
      code: type.code,
      name: typeNames.get(type.code) ?? type.nameEn,
    }))
    .sort(byLabel((type) => type.name));
  const specialtyNames = new Map(SPECIALTIES.map((item) => [item.slug, item.name]));
  const specialtyOpts = options.specialties
    .map((item) => ({
      slug: item.slug,
      name: specialtyNames.get(item.slug) ?? item.nameEn,
    }))
    .sort(byLabel((item) => item.name));
  const ranges = (
    [
      ["pen", "Penetration"],
      ["armor", "Armor"],
      ["speed", "Speed"],
      ["range", "Range"],
      ["helmet", "Helmet"],
      ["shield", "Shield"],
    ] as const
  ).filter(([key]) => options.stats[key]);

  const reset = () =>
    void setParams({
      q: "",
      faction: [],
      type: [],
      specialty: [],
      penMin: null,
      penMax: null,
      armorMin: null,
      armorMax: null,
      speedMin: null,
      speedMax: null,
      rangeMin: null,
      rangeMax: null,
      helmetMin: null,
      helmetMax: null,
      shieldMin: null,
      shieldMax: null,
      tier: [],
      cursor: null,
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-card p-4">
        <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
          Reset filters
        </Button>
      </div>
      <ScrollArea type="auto" className="min-h-0 flex-1">
      <div className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <Label htmlFor="units-q">Search</Label>
        <Input
          id="units-q"
          value={params.q}
          maxLength={64}
          placeholder="Unit name..."
          onChange={(e) =>
            void setParams({ q: e.target.value.slice(0, 64), cursor: null })
          }
        />
      </div>

      {factionOpts.length > 0 ? (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Faction</legend>
        {factionOpts.map((f) => (
          <label key={f.slug} className="hit-row flex items-center gap-2 text-sm">
            <Checkbox
              checked={params.faction.includes(f.slug)}
              onCheckedChange={() => toggle("faction", f.slug)}
            />
            <span
              className="size-2.5 rounded-sm"
              style={{
                backgroundColor: safeCssColor(
                  f.color || FACTION_COLORS[f.slug],
                ),
              }}
              aria-hidden
            />
            {f.nameEn}
          </label>
        ))}
      </fieldset>
      ) : null}

      {typeOpts.length > 0 ? (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Unit type</legend>
        {typeOpts.map((t) => (
          <label key={t.code} className="hit-row flex items-center gap-2 text-sm">
            <Checkbox
              checked={params.type.includes(t.code)}
              onCheckedChange={() => toggle("type", t.code)}
            />
            {t.name}
          </label>
        ))}
      </fieldset>
      ) : null}

      {specialtyOpts.length > 0 ? (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Main Specialty</legend>
        {specialtyOpts.map((s) => (
          <label key={s.slug} className="hit-row flex items-center gap-2 text-sm">
            <Checkbox
              checked={params.specialty.includes(s.slug)}
              onCheckedChange={() => toggle("specialty", s.slug)}
            />
            {s.name}
          </label>
        ))}
      </fieldset>
      ) : null}

      {ranges.map(([key, label]) => {
        const minKey = `${key}Min` as
          | "penMin"
          | "armorMin"
          | "speedMin"
          | "rangeMin"
          | "helmetMin"
          | "shieldMin";
        const maxKey = `${key}Max` as
          | "penMax"
          | "armorMax"
          | "speedMax"
          | "rangeMax"
          | "helmetMax"
          | "shieldMax";
        return (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="font-stat"
                value={params[minKey] ?? ""}
                onChange={(e) =>
                  void setParams({
                    [minKey]: e.target.value === "" ? null : Number(e.target.value),
                    cursor: null,
                  })
                }
              />
              <Input
                type="number"
                placeholder="Max"
                className="font-stat"
                value={params[maxKey] ?? ""}
                onChange={(e) =>
                  void setParams({
                    [maxKey]: e.target.value === "" ? null : Number(e.target.value),
                    cursor: null,
                  })
                }
              />
            </div>
          </div>
        );
      })}
      </div>
      </ScrollArea>
    </div>
  );
}

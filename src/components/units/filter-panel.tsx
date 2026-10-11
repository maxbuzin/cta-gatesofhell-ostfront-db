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
import { FACTION_COLORS } from "@/lib/stats/definitions";

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

type FactionOpt = { slug: string; nameEn: string; color: string | null };

export function FilterPanel({ factions }: { factions: FactionOpt[] }) {
  const [params, setParams] = useQueryStates(
    {
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
      page: parseAsInteger.withDefault(1),
    },
    { history: "replace", shallow: false },
  );

  const toggle = (key: "faction" | "type" | "specialty", value: string) => {
    const cur = params[key];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    void setParams({ [key]: next, page: 1 });
  };

  const factionOpts =
    factions.length > 0
      ? factions
      : Object.keys(FACTION_COLORS).map((slug) => ({
          slug,
          nameEn: slug,
          color: FACTION_COLORS[slug],
        }));

  return (
    <aside className="space-y-5 rounded-md border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="units-q">Search</Label>
        <Input
          id="units-q"
          value={params.q}
          maxLength={64}
          placeholder="Unit name..."
          onChange={(e) =>
            void setParams({ q: e.target.value.slice(0, 64), page: 1 })
          }
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Faction</legend>
        {factionOpts.map((f) => (
          <label key={f.slug} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={params.faction.includes(f.slug)}
              onCheckedChange={() => toggle("faction", f.slug)}
            />
            <span
              className="size-2.5 rounded-sm"
              style={{
                backgroundColor: f.color || FACTION_COLORS[f.slug] || "#7A8B5C",
              }}
              aria-hidden
            />
            {f.nameEn}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Unit type</legend>
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {TYPES.map((t) => (
            <label key={t.code} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={params.type.includes(t.code)}
                onCheckedChange={() => toggle("type", t.code)}
              />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Main Specialty</legend>
        {SPECIALTIES.map((s) => (
          <label key={s.slug} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={params.specialty.includes(s.slug)}
              onCheckedChange={() => toggle("specialty", s.slug)}
            />
            {s.name}
          </label>
        ))}
      </fieldset>

      {(
        [
          ["pen", "Penetration"],
          ["armor", "Armor"],
          ["speed", "Speed"],
          ["range", "Range"],
          ["helmet", "Helmet"],
          ["shield", "Shield"],
        ] as const
      ).map(([key, label]) => {
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
                    page: 1,
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
                    page: 1,
                  })
                }
              />
            </div>
          </div>
        );
      })}

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() =>
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
            page: 1,
          })
        }
      >
        Reset filters
      </Button>
    </aside>
  );
}

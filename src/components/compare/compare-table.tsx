"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatCell } from "@/components/units/stat-cell";
import { UnitSilhouette } from "@/components/units/unit-silhouette";
import { STATS, type StatDef } from "@/lib/stats/definitions";
import { cn } from "@/lib/utils";

type CompareUnit = {
  slug: string;
  name: string;
  factionSlug: string;
  stats: {
    hp: number | null;
    armorFrontMm: number | null;
    speedRoadKmh: number | null;
    reloadS: number | null;
    penetrationMm: number | null;
    caliberMm: number | null;
    rangeM: number | null;
    visionRangeM: number | null;
    startingVeterancy: number | null;
  } | null;
  maxRangeM: number | null;
  costCp: number | null;
  costResources: number | null;
  squadSize: number | null;
};

function shownRange(u: CompareUnit) {
  return u.maxRangeM ?? u.stats?.rangeM ?? null;
}

function apRange(u: CompareUnit) {
  const ap = u.stats?.rangeM ?? null;
  const max = shownRange(u);
  if (ap == null || max == null || ap === max) return null;
  return ap;
}

const ROWS: { key: string; def: StatDef; get: (u: CompareUnit) => number | null }[] = [
  { key: "costCp", def: STATS.costCp, get: (u) => u.costCp },
  { key: "costResources", def: STATS.costResources, get: (u) => u.costResources },
  { key: "hp", def: STATS.hp, get: (u) => u.stats?.hp ?? null },
  { key: "armorFrontMm", def: STATS.armorFrontMm, get: (u) => u.stats?.armorFrontMm ?? null },
  { key: "speedRoadKmh", def: STATS.speedRoadKmh, get: (u) => u.stats?.speedRoadKmh ?? null },
  { key: "reloadS", def: STATS.reloadS, get: (u) => u.stats?.reloadS ?? null },
  { key: "penetrationMm", def: STATS.penetrationMm, get: (u) => u.stats?.penetrationMm ?? null },
  { key: "caliberMm", def: STATS.caliberMm, get: (u) => u.stats?.caliberMm ?? null },
  { key: "rangeM", def: STATS.rangeM, get: shownRange },
  {
    key: "apRangeM",
    def: { ...STATS.rangeM, key: "apRangeM", label: "AP range" },
    get: apRange,
  },
  { key: "visionRangeM", def: STATS.visionRangeM, get: (u) => u.stats?.visionRangeM ?? null },
  { key: "startingVeterancy", def: STATS.startingVeterancy, get: (u) => u.stats?.startingVeterancy ?? null },
];

function bestIndex(values: (number | null)[], direction: StatDef["direction"]) {
  if (direction === "neutral") return -1;
  let best = -1;
  let bestVal: number | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    if (bestVal === null) {
      best = i;
      bestVal = v;
      return;
    }
    if (direction === "higher" && v > bestVal) {
      best = i;
      bestVal = v;
    }
    if (direction === "lower" && v < bestVal) {
      best = i;
      bestVal = v;
    }
  });
  return best;
}

export function CompareTable({ units }: { units: CompareUnit[] }) {
  const [diffOnly, setDiffOnly] = useState(false);

  const families = useMemo(() => {
    const map = new Map<string, typeof ROWS>();
    for (const row of ROWS) {
      const list = map.get(row.def.family) ?? [];
      list.push(row);
      map.set(row.def.family, list);
    }
    return map;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          id="diff-only"
          checked={diffOnly}
          onCheckedChange={setDiffOnly}
        />
        <Label htmlFor="diff-only">Show only differences</Label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 bg-card p-3 text-left font-medium">Stat</th>
              {units.map((u) => (
                <th key={u.slug} className="min-w-40 p-3 text-left">
                  <UnitSilhouette className="mb-2 aspect-[16/9] max-h-24" label={u.name} />
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.factionSlug}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...families.entries()].map(([family, rows]) => {
              const visible = rows.filter((row) => {
                const vals = units.map((u) => row.get(u));
                if (vals.every((v) => v === null)) return false;
                if (!diffOnly) return true;
                const first = vals.find((v) => v !== null);
                return vals.some((v) => v !== first);
              });
              if (visible.length === 0) return null;
              return (
                <FragmentRows key={family} family={family} rows={visible} units={units} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({
  family,
  rows,
  units,
}: {
  family: string;
  rows: typeof ROWS;
  units: CompareUnit[];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={units.length + 1}
          className="bg-muted/40 px-3 py-2 font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          {family}
        </td>
      </tr>
      {rows.map((row) => {
        const values = units.map((u) => row.get(u));
        const best = bestIndex(values, row.def.direction);
        const nums = values.filter((v): v is number => v !== null);
        const min = nums.length ? Math.min(...nums) : 0;
        const max = nums.length ? Math.max(...nums) : 1;
        return (
          <tr key={row.key} className="border-t border-border">
            <td className="sticky left-0 bg-background p-3 text-muted-foreground">
              {row.def.label}
            </td>
            {values.map((v, i) => (
              <td key={units[i].slug} className="p-3">
                <span className={cn("inline-flex items-center gap-1")}>
                  <StatCell
                    value={v}
                    label={row.def.label}
                    group={row.def.group}
                    direction={row.def.direction}
                    unit={row.def.unit}
                    icon={row.def.icon}
                    min={min}
                    max={max}
                    best={i === best && best >= 0}
                  />
                  {i === best && best >= 0 ? (
                    <Trophy className="size-3.5 text-brass" aria-label="best" />
                  ) : null}
                </span>
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

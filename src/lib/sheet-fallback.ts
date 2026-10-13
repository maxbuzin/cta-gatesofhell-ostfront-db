import "server-only";

import raw from "@/data/sheet-units.json";
import {
  decodeCursor,
  encodeCursor,
  type CursorSortKey,
} from "@/lib/db/keyset-cursor";
import { escapeLike } from "@/lib/safe";

type Unit = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  searchName: string;
  tier: number | null;
  notes: string | null;
  squadSize: number | null;
  crewSize: number | null;
  confidence: string;
  descriptionEn: string | null;
  bestAt: string | null;
  weakAgainst: string | null;
  factionId: number;
  factionSlug: string;
  factionName: string;
  factionColor: string;
  typeCode: string;
  typeName: string;
  category: string;
  stats: {
    hp: number | null;
    armorFrontMm: number | null;
    armorSideMm: number | null;
    armorRearMm: number | null;
    armorTopMm: number | null;
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
  };
  costs: { kind: string; amount: number }[];
  costCp: number | null;
  costResources: number | null;
  specialties: { slug: string; nameEn: string }[];
  weapons: {
    weaponId: number;
    slug: string;
    name: string;
    caliberMm: number | null;
    reloadS: number | null;
    maxRangeM: number | null;
    mount: string;
    quantity: number;
    ammo: {
      weaponId: number;
      ammoId: number;
      ammoSlug: string;
      ammoName: string;
      kind: string;
      caliberMm: number | null;
      isDefault: boolean | null;
    }[];
  }[];
  penetration: {
    ammoTypeId: number;
    rangeM: number;
    penetrationMm: number;
    angleDeg: number;
  }[];
};

const data = raw as {
  version: {
    id: number;
    code: string;
    name: string | null;
    releasedAt: string | null;
    isCurrent: boolean;
    notesUrl: string | null;
  };
  source: {
    id: number;
    kind: string;
    title: string;
    url: string;
    license: string | null;
    author: string | null;
    revision: string | null;
    retrievedAt: string;
    notes: string | null;
  };
  factions: {
    id: number;
    slug: string;
    nameEn: string;
    namePt: string | null;
    color: string;
    sortOrder: number;
    strengths: string | null;
    weaknesses: string | null;
  }[];
  units: Unit[];
};
type Filters = {
  q?: string;
  faction?: string[];
  type?: string[];
  specialty?: string[];
  sort?: string;
  cursor?: string | null;
  pageSize?: number;
  penMin?: number;
  penMax?: number;
  armorMin?: number;
  armorMax?: number;
  speedMin?: number;
  speedMax?: number;
  rangeMin?: number;
  rangeMax?: number;
  helmetMin?: number;
  helmetMax?: number;
  shieldMin?: number;
  shieldMax?: number;
  tier?: number[];
};

const SORTS = new Set<CursorSortKey>([
  "name_asc",
  "name_desc",
  "hp_asc",
  "hp_desc",
  "armor_asc",
  "armor_desc",
  "speed_asc",
  "speed_desc",
  "pen_asc",
  "pen_desc",
]);

const units = data.units as Unit[];

function sortKey(sort?: string): CursorSortKey {
  return sort && SORTS.has(sort as CursorSortKey)
    ? (sort as CursorSortKey)
    : "name_asc";
}

function sortValue(unit: Unit, key: CursorSortKey): string | number | null {
  if (key.startsWith("name")) return unit.name;
  if (key.startsWith("hp")) return unit.stats.hp;
  if (key.startsWith("armor")) return unit.stats.armorFrontMm;
  if (key.startsWith("speed")) return unit.stats.speedRoadKmh;
  return unit.stats.penetrationMm;
}

function inRange(value: number | null, min?: number, max?: number) {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function matches(unit: Unit, filters: Filters) {
  if (filters.q) {
    const q = escapeLike(filters.q.slice(0, 64)).toLowerCase();
    if (!unit.searchName.includes(q)) return false;
  }
  if (filters.faction?.length && !filters.faction.includes(unit.factionSlug)) {
    return false;
  }
  if (filters.type?.length && !filters.type.includes(unit.typeCode)) return false;
  if (filters.tier?.length && (unit.tier == null || !filters.tier.includes(unit.tier))) {
    return false;
  }
  if (
    filters.specialty?.length &&
    !unit.specialties.some((spec) => filters.specialty?.includes(spec.slug))
  ) {
    return false;
  }
  if (!inRange(unit.stats.penetrationMm, filters.penMin, filters.penMax)) return false;
  if (!inRange(unit.stats.armorFrontMm, filters.armorMin, filters.armorMax)) return false;
  if (!inRange(unit.stats.speedRoadKmh, filters.speedMin, filters.speedMax)) return false;
  if (!inRange(unit.stats.rangeM, filters.rangeMin, filters.rangeMax)) return false;
  if (!inRange(unit.costCp, filters.helmetMin, filters.helmetMax)) return false;
  if (!inRange(unit.costResources, filters.shieldMin, filters.shieldMax)) return false;
  return true;
}

function afterCursor(unit: Unit, key: CursorSortKey, cursor: NonNullable<ReturnType<typeof decodeCursor>>) {
  const dir = key.endsWith("_desc") ? "desc" : "asc";
  const value = sortValue(unit, key);
  if (cursor.v == null) {
    if (value != null) return false;
    return dir === "asc" ? unit.id > cursor.id : unit.id < cursor.id;
  }
  if (value == null) return true;
  if (value > cursor.v) return dir === "asc";
  if (value < cursor.v) return dir === "desc";
  return dir === "asc" ? unit.id > cursor.id : unit.id < cursor.id;
}

export function sheetFactions() {
  return data.factions;
}

export function sheetFaction(slug: string) {
  return data.factions.find((faction) => faction.slug === slug) ?? null;
}

export function sheetVersion() {
  return data.version;
}

export function sheetVersions() {
  return [data.version];
}

export function sheetSourceList() {
  return [data.source];
}

export function sheetSpecialties() {
  const map = new Map<string, { slug: string; nameEn: string }>();
  for (const unit of units) {
    for (const spec of unit.specialties) map.set(spec.slug, spec);
  }
  return [...map.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export function sheetCounts() {
  const counts = new Map<string, { code: string; nameEn: string; count: number }>();
  for (const unit of units) {
    const cur = counts.get(unit.typeCode) ?? {
      code: unit.typeCode,
      nameEn: unit.typeName,
      count: 0,
    };
    cur.count += 1;
    counts.set(unit.typeCode, cur);
  }
  return [...counts.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export function sheetFactionCounts(factionId: number) {
  return sheetCounts()
    .map((row) => ({
      typeCode: row.code,
      typeName: row.nameEn,
      count: units.filter(
        (unit) => unit.factionId === factionId && unit.typeCode === row.code,
      ).length,
    }))
    .filter((row) => row.count > 0);
}

export function sheetList(filters: Filters) {
  const key = sortKey(filters.sort);
  const dir = key.endsWith("_desc") ? "desc" : "asc";
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const cursor = decodeCursor(filters.cursor, key);
  const filtered = units.filter((unit) => matches(unit, filters));
  const sorted = [...filtered].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av == null && bv == null) return dir === "asc" ? a.id - b.id : b.id - a.id;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return dir === "asc" ? a.id - b.id : b.id - a.id;
  });
  const page = cursor
    ? sorted.filter((unit) => afterCursor(unit, key, cursor))
    : sorted;
  const slice = page.slice(0, pageSize + 1);
  const hasMore = slice.length > pageSize;
  const rows = hasMore ? slice.slice(0, pageSize) : slice;
  const last = rows[rows.length - 1];
  return {
    rows: rows.map((unit) => ({
      id: unit.id,
      slug: unit.slug,
      name: unit.name,
      shortName: unit.shortName,
      tier: unit.tier,
      notes: unit.notes,
      squadSize: unit.squadSize,
      factionSlug: unit.factionSlug,
      factionName: unit.factionName,
      factionColor: unit.factionColor,
      typeCode: unit.typeCode,
      typeName: unit.typeName,
      category: unit.category,
      hp: unit.stats.hp,
      armorFrontMm: unit.stats.armorFrontMm,
      speedRoadKmh: unit.stats.speedRoadKmh,
      reloadS: unit.stats.reloadS,
      penetrationMm: unit.stats.penetrationMm,
      caliberMm: unit.stats.caliberMm,
      rangeM: unit.stats.rangeM,
      startingVeterancy: unit.stats.startingVeterancy,
      visionRangeM: unit.stats.visionRangeM,
      hpPerSoldier: unit.stats.hpPerSoldier,
      rifles: unit.stats.rifles,
      semiAuto: unit.stats.semiAuto,
      smgs: unit.stats.smgs,
      mgs: unit.stats.mgs,
      atWeapons: unit.stats.atWeapons,
      sniperRifles: unit.stats.sniperRifles,
      costCp: unit.costCp,
      costResources: unit.costResources,
      specialties: unit.specialties,
    })),
    total: filtered.length,
    nextCursor:
      hasMore && last
        ? encodeCursor({ id: last.id, v: sortValue(last, key), k: key })
        : null,
  };
}

export function sheetUnit(slug: string) {
  return units.find((unit) => unit.slug === slug) ?? null;
}

export function sheetUnitsBySlugs(slugs: string[]) {
  const unique = [
    ...new Set(slugs.filter((slug) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))),
  ].slice(0, 4);
  return unique
    .map((slug) => sheetUnit(slug))
    .filter((unit) => unit != null);
}

export function sheetSearch() {
  return [...units]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 2000)
    .map((unit) => ({
      id: unit.id,
      slug: unit.slug,
      name: unit.name,
      shortName: unit.shortName,
      factionSlug: unit.factionSlug,
      typeCode: unit.typeCode,
      typeName: unit.typeName,
    }));
}

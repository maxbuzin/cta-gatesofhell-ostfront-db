import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  decodeCursor,
  encodeCursor,
  type CursorSortKey,
} from "@/lib/db/keyset-cursor";
import { escapeLike } from "@/lib/safe";
import {
  mapSnapshot,
  SNAPSHOT_FACTIONS,
  SNAPSHOT_TYPES,
} from "../../etl/snapshot-map.mjs";

type Stats = {
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
  stats: Stats;
  costs: { kind: string; amount: number }[];
  costCp: number | null;
  costResources: number | null;
  roster: string | null;
  period: string | null;
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

type Faction = {
  id: number;
  slug: string;
  nameEn: string;
  namePt: string | null;
  color: string;
  sortOrder: number;
  strengths: string | null;
  weaknesses: string | null;
};

type ResearchNode = {
  id: number;
  slug: string;
  name: string;
  branch: string | null;
  column: number | null;
  row: number | null;
  researchCost: number | null;
  factionSlug: string;
  units: { unitSlug: string; unitName: string }[];
};

type Catalog = {
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
    url: string | null;
    license: string | null;
    author: string | null;
    revision: string | null;
    retrievedAt: string;
    notes: string | null;
  };
  factions: Faction[];
  units: Unit[];
  researchNodes: ResearchNode[];
  researchEdges: { fromNodeId: number; toNodeId: number; kind: string }[];
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

type MappedAmmo = {
  slug: string;
  name: string;
  kind: string;
  caliberMm: number | null;
  isDefault: boolean;
  pen: { rangeM: number; mm: number }[];
};

type MappedWeapon = {
  slug: string;
  name: string;
  caliberMm: number | null;
  rateOfFireRpm: number | null;
  reloadS: number | null;
  maxRangeM: number | null;
  mount: string;
  quantity: number;
  ammo: MappedAmmo[];
};

type MappedRecord = {
  slug: string;
  name: string;
  shortName: string | null;
  searchName: string;
  factionSlug: string;
  typeCode: string;
  crewSize: number | null;
  squadSize: number | null;
  tier: number | null;
  notes: string | null;
  costs: { kind: string; amount: number }[];
  specialties: { slug: string; nameEn: string }[];
  weapons: MappedWeapon[];
  stats: Stats & Record<string, unknown>;
};

type MappedResearch = {
  factionSlug: string;
  slug: string;
  name: string;
  branch: string | null;
  researchCost: number | null;
  requires: string[];
  unitSlugs: string[];
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

const FILE = path.join(process.cwd(), "data/snapshots/game-units.json");

function textExtra(stats: MappedRecord["stats"], key: "roster" | "period") {
  const extra = stats.extra;
  if (!extra || typeof extra !== "object") return null;
  const value = (extra as { roster?: unknown; period?: unknown })[key];
  return typeof value === "string" && value ? value : null;
}

let catalog: Catalog | null = null;

function buildCatalog(): Catalog {
  const doc = JSON.parse(readFileSync(FILE, "utf8")) as { units?: unknown[] };
  const mapped = mapSnapshot(doc) as {
    records: MappedRecord[];
    research: MappedResearch[];
  };
  const factions: Faction[] = SNAPSHOT_FACTIONS.map((faction, index) => ({
    id: index + 1,
    slug: faction.slug,
    nameEn: faction.nameEn,
    namePt: null,
    color: faction.color,
    sortOrder: faction.sortOrder,
    strengths: null,
    weaknesses: null,
  }));
  const factionBySlug = new Map(factions.map((faction) => [faction.slug, faction]));
  const typeByCode = new Map(
    SNAPSHOT_TYPES.map((type, index) => [type.code, { ...type, id: index + 1 }]),
  );
  const weaponIds = new Map<string, number>();
  const ammoIds = new Map<string, number>();
  let nextWeapon = 1;
  let nextAmmo = 1;
  const units: Unit[] = mapped.records.map((record, index) => {
    const faction = factionBySlug.get(record.factionSlug);
    const type = typeByCode.get(record.typeCode);
    const weapons = record.weapons.map((weapon) => {
      let weaponId = weaponIds.get(weapon.slug);
      if (weaponId == null) {
        weaponId = nextWeapon;
        nextWeapon += 1;
        weaponIds.set(weapon.slug, weaponId);
      }
      const ammo = weapon.ammo.map((shell) => {
        let ammoId = ammoIds.get(shell.slug);
        if (ammoId == null) {
          ammoId = nextAmmo;
          nextAmmo += 1;
          ammoIds.set(shell.slug, ammoId);
        }
        return {
          weaponId,
          ammoId,
          ammoSlug: shell.slug,
          ammoName: shell.name,
          kind: shell.kind,
          caliberMm: shell.caliberMm,
          isDefault: shell.isDefault,
          pen: shell.pen,
        };
      });
      return {
        weaponId,
        slug: weapon.slug,
        name: weapon.name,
        caliberMm: weapon.caliberMm,
        reloadS: weapon.reloadS,
        maxRangeM: weapon.maxRangeM,
        mount: weapon.mount,
        quantity: weapon.quantity,
        ammo,
      };
    });
    const penetration = weapons.flatMap((weapon) =>
      weapon.ammo.flatMap((shell) =>
        shell.pen.map((point) => ({
          ammoTypeId: shell.ammoId,
          rangeM: point.rangeM,
          penetrationMm: point.mm,
          angleDeg: 0,
        })),
      ),
    );
    const stats = record.stats;
    return {
      id: index + 1,
      slug: record.slug,
      name: record.name,
      shortName: record.shortName,
      searchName: record.searchName,
      tier: record.tier,
      notes: record.notes,
      squadSize: record.squadSize,
      crewSize: record.crewSize,
      confidence: "verified",
      descriptionEn: null,
      bestAt: null,
      weakAgainst: null,
      factionId: faction?.id ?? 0,
      factionSlug: record.factionSlug,
      factionName: faction?.nameEn ?? record.factionSlug,
      factionColor: faction?.color ?? "#5E6B73",
      typeCode: record.typeCode,
      typeName: type?.nameEn ?? record.typeCode,
      category: type?.category ?? "infantry",
      stats: {
        hp: stats.hp,
        armorFrontMm: stats.armorFrontMm,
        armorSideMm: stats.armorSideMm,
        armorRearMm: stats.armorRearMm,
        armorTopMm: stats.armorTopMm,
        speedRoadKmh: stats.speedRoadKmh,
        reloadS: stats.reloadS,
        penetrationMm: stats.penetrationMm,
        caliberMm: stats.caliberMm,
        rangeM: stats.rangeM,
        startingVeterancy: stats.startingVeterancy,
        visionRangeM: stats.visionRangeM,
        hpPerSoldier: stats.hpPerSoldier,
        rifles: stats.rifles,
        semiAuto: stats.semiAuto,
        smgs: stats.smgs,
        mgs: stats.mgs,
        atWeapons: stats.atWeapons,
        sniperRifles: stats.sniperRifles,
      },
      costs: record.costs,
      costCp: record.costs.find((cost) => cost.kind === "cp")?.amount ?? null,
      costResources: record.costs.find((cost) => cost.kind === "resources")?.amount ?? null,
      roster: textExtra(record.stats, "roster"),
      period: textExtra(record.stats, "period"),
      specialties: record.specialties,
      weapons: weapons.map((weapon) => ({
        weaponId: weapon.weaponId,
        slug: weapon.slug,
        name: weapon.name,
        caliberMm: weapon.caliberMm,
        reloadS: weapon.reloadS,
        maxRangeM: weapon.maxRangeM,
        mount: weapon.mount,
        quantity: weapon.quantity,
        ammo: weapon.ammo.map((shell) => ({
          weaponId: shell.weaponId,
          ammoId: shell.ammoId,
          ammoSlug: shell.ammoSlug,
          ammoName: shell.ammoName,
          kind: shell.kind,
          caliberMm: shell.caliberMm,
          isDefault: shell.isDefault,
        })),
      })),
      penetration,
    };
  });

  const nameBySlug = new Map(units.map((unit) => [unit.slug, unit.name]));
  const researchNodes: ResearchNode[] = mapped.research.map((node, index) => ({
    id: index + 1,
    slug: node.slug,
    name: node.name,
    branch: node.branch,
    column: null,
    row: null,
    researchCost: node.researchCost,
    factionSlug: node.factionSlug,
    units: node.unitSlugs.map((slug) => ({
      unitSlug: slug,
      unitName: nameBySlug.get(slug) ?? slug,
    })),
  }));
  const nodeId = new Map(researchNodes.map((node) => [`${node.factionSlug}|${node.slug}`, node.id]));
  const researchEdges: Catalog["researchEdges"] = [];
  for (const node of mapped.research) {
    const toNodeId = nodeId.get(`${node.factionSlug}|${node.slug}`);
    if (toNodeId == null) continue;
    for (const req of node.requires) {
      const fromNodeId = nodeId.get(`${node.factionSlug}|${req}`);
      if (fromNodeId == null || fromNodeId === toNodeId) continue;
      researchEdges.push({ fromNodeId, toNodeId, kind: "requires" });
    }
  }

  return {
    version: {
      id: 1,
      code: "game",
      name: "game",
      releasedAt: null,
      isCurrent: true,
      notesUrl: null,
    },
    source: {
      id: 1,
      kind: "game_files_research",
      title: "Gates of Hell game files",
      url: null,
      license: null,
      author: null,
      revision: "game",
      retrievedAt: new Date().toISOString(),
      notes: null,
    },
    factions,
    units,
    researchNodes,
    researchEdges,
  };
}

function load() {
  if (!catalog) catalog = buildCatalog();
  return catalog;
}

function sortKey(sort?: string): CursorSortKey {
  return sort && SORTS.has(sort as CursorSortKey) ? (sort as CursorSortKey) : "name_asc";
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
  if (filters.faction?.length && !filters.faction.includes(unit.factionSlug)) return false;
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

export function snapshotFactions() {
  return load().factions;
}

export function snapshotFaction(slug: string) {
  return load().factions.find((faction) => faction.slug === slug) ?? null;
}

export function snapshotVersion() {
  return load().version;
}

export function snapshotVersions() {
  return [load().version];
}

export function snapshotSourceList() {
  return [load().source];
}

export function snapshotSpecialties() {
  return [] as { slug: string; nameEn: string }[];
}

export function snapshotCounts() {
  const counts = new Map<string, { code: string; nameEn: string; count: number }>();
  for (const unit of load().units) {
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

export function snapshotFactionCounts(factionId: number) {
  return snapshotCounts()
    .map((row) => ({
      typeCode: row.code,
      typeName: row.nameEn,
      count: load().units.filter(
        (unit) => unit.factionId === factionId && unit.typeCode === row.code,
      ).length,
    }))
    .filter((row) => row.count > 0);
}

export function snapshotList(filters: Filters) {
  const key = sortKey(filters.sort);
  const dir = key.endsWith("_desc") ? "desc" : "asc";
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const cursor = decodeCursor(filters.cursor, key);
  const filtered = load().units.filter((unit) => matches(unit, filters));
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
  const page = cursor ? sorted.filter((unit) => afterCursor(unit, key, cursor)) : sorted;
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
      roster: unit.roster,
      period: unit.period,
      specialties: unit.specialties,
    })),
    total: filtered.length,
    nextCursor:
      hasMore && last ? encodeCursor({ id: last.id, v: sortValue(last, key), k: key }) : null,
  };
}

export function snapshotUnit(slug: string) {
  return load().units.find((unit) => unit.slug === slug) ?? null;
}

export function snapshotUnitsBySlugs(slugs: string[]) {
  const unique = [
    ...new Set(slugs.filter((slug) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))),
  ].slice(0, 4);
  return unique.map((slug) => snapshotUnit(slug)).filter((unit) => unit != null);
}

export function snapshotSearch() {
  return [...load().units]
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

export function snapshotResearch(factionSlug: string) {
  const data = load();
  const faction = data.factions.find((row) => row.slug === factionSlug) ?? null;
  if (!faction) return { nodes: [], edges: [], faction: null };
  const nodes = data.researchNodes.filter((node) => node.factionSlug === factionSlug);
  const ids = new Set(nodes.map((node) => node.id));
  return {
    faction,
    nodes,
    edges: data.researchEdges.filter(
      (edge) => ids.has(edge.fromNodeId) && ids.has(edge.toNodeId),
    ),
  };
}

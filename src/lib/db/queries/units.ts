import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  factions,
  specialties,
  unitCosts,
  unitSpecialties,
  unitStats,
  unitTypes,
  units,
  weapons,
  unitWeapons,
  ammoTypes,
  weaponAmmo,
  penetrationByRange,
  researchNodes,
  researchNodeUnits,
  researchEdges,
  gameVersions,
  popularComparisons,
  sources,
} from "@/lib/db/schema";
import { escapeLike } from "@/lib/safe";

export type UnitListFilters = {
  q?: string;
  faction?: string[];
  type?: string[];
  specialty?: string[];
  sort?: string;
  page?: number;
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

const SORT_MAP = {
  name_asc: { col: units.name, dir: "asc" as const },
  name_desc: { col: units.name, dir: "desc" as const },
  hp_asc: { col: unitStats.hp, dir: "asc" as const },
  hp_desc: { col: unitStats.hp, dir: "desc" as const },
  armor_asc: { col: unitStats.armorFrontMm, dir: "asc" as const },
  armor_desc: { col: unitStats.armorFrontMm, dir: "desc" as const },
  speed_asc: { col: unitStats.speedRoadKmh, dir: "asc" as const },
  speed_desc: { col: unitStats.speedRoadKmh, dir: "desc" as const },
  pen_asc: { col: unitStats.penetrationMm, dir: "asc" as const },
  pen_desc: { col: unitStats.penetrationMm, dir: "desc" as const },
} as const;

export type SortKey = keyof typeof SORT_MAP;

export async function getUnitCountsByType(): Promise<
  { code: string; nameEn: string; count: number }[]
> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        code: unitTypes.code,
        nameEn: unitTypes.nameEn,
        count: sql<number>`count(${units.id})::int`,
      })
      .from(unitTypes)
      .leftJoin(units, eq(units.unitTypeId, unitTypes.id))
      .groupBy(unitTypes.id)
      .orderBy(asc(unitTypes.nameEn));
    return rows;
  } catch {
    console.error("Failed to load unit type counts");
    return [];
  }
}

export async function getFactions() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db.select().from(factions).orderBy(asc(factions.sortOrder));
  } catch {
    console.error("Failed to load factions");
    return [];
  }
}

export async function getFactionBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select()
      .from(factions)
      .where(eq(factions.slug, slug))
      .limit(1);
    return row ?? null;
  } catch {
    console.error("Failed to load faction");
    return null;
  }
}

export async function getSpecialties() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db.select().from(specialties).orderBy(asc(specialties.nameEn));
  } catch {
    console.error("Failed to load specialties");
    return [];
  }
}

export async function getCurrentGameVersion() {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select()
      .from(gameVersions)
      .where(eq(gameVersions.isCurrent, true))
      .limit(1);
    return row ?? null;
  } catch {
    console.error("Failed to load game version");
    return null;
  }
}

export async function getPopularComparisons() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(popularComparisons)
      .orderBy(asc(popularComparisons.sortOrder));
  } catch {
    console.error("Failed to load popular comparisons");
    return [];
  }
}

export async function getSourcesList() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db.select().from(sources).orderBy(asc(sources.title));
  } catch {
    console.error("Failed to load sources");
    return [];
  }
}

export async function getGameVersions() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(gameVersions)
      .orderBy(desc(gameVersions.releasedAt));
  } catch {
    console.error("Failed to load game versions");
    return [];
  }
}

export async function listUnits(filters: UnitListFilters) {
  const db = getDb();
  if (!db) {
    return { rows: [], total: 0 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const sortKey = (filters.sort ?? "name_asc") as SortKey;
  const sort = SORT_MAP[sortKey] ?? SORT_MAP.name_asc;

  try {
    const conditions = [];

    if (filters.q) {
      const q = escapeLike(filters.q.slice(0, 64));
      conditions.push(ilike(units.searchName, `%${q}%`));
    }
    if (filters.faction?.length) {
      conditions.push(inArray(factions.slug, filters.faction));
    }
    if (filters.type?.length) {
      conditions.push(inArray(unitTypes.code, filters.type));
    }
    if (filters.penMin !== undefined) {
      conditions.push(gte(unitStats.penetrationMm, filters.penMin));
    }
    if (filters.penMax !== undefined) {
      conditions.push(lte(unitStats.penetrationMm, filters.penMax));
    }
    if (filters.armorMin !== undefined) {
      conditions.push(gte(unitStats.armorFrontMm, filters.armorMin));
    }
    if (filters.armorMax !== undefined) {
      conditions.push(lte(unitStats.armorFrontMm, filters.armorMax));
    }
    if (filters.speedMin !== undefined) {
      conditions.push(gte(unitStats.speedRoadKmh, filters.speedMin));
    }
    if (filters.speedMax !== undefined) {
      conditions.push(lte(unitStats.speedRoadKmh, filters.speedMax));
    }
    if (filters.rangeMin !== undefined) {
      conditions.push(gte(unitStats.rangeM, filters.rangeMin));
    }
    if (filters.rangeMax !== undefined) {
      conditions.push(lte(unitStats.rangeM, filters.rangeMax));
    }
    if (filters.tier?.length) {
      conditions.push(inArray(units.tier, filters.tier));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const orderBy = sort.dir === "asc" ? asc(sort.col) : desc(sort.col);

    const rows = await db
      .select({
        id: units.id,
        slug: units.slug,
        name: units.name,
        shortName: units.shortName,
        tier: units.tier,
        notes: units.notes,
        squadSize: units.squadSize,
        factionSlug: factions.slug,
        factionName: factions.nameEn,
        factionColor: factions.color,
        typeCode: unitTypes.code,
        typeName: unitTypes.nameEn,
        category: unitTypes.category,
        hp: unitStats.hp,
        armorFrontMm: unitStats.armorFrontMm,
        speedRoadKmh: unitStats.speedRoadKmh,
        reloadS: unitStats.reloadS,
        penetrationMm: unitStats.penetrationMm,
        caliberMm: unitStats.caliberMm,
        rangeM: unitStats.rangeM,
        startingVeterancy: unitStats.startingVeterancy,
        visionRangeM: unitStats.visionRangeM,
        hpPerSoldier: unitStats.hpPerSoldier,
        rifles: unitStats.rifles,
        semiAuto: unitStats.semiAuto,
        smgs: unitStats.smgs,
        mgs: unitStats.mgs,
        atWeapons: unitStats.atWeapons,
        sniperRifles: unitStats.sniperRifles,
      })
      .from(units)
      .innerJoin(factions, eq(units.factionId, factions.id))
      .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
      .leftJoin(unitStats, eq(unitStats.unitId, units.id))
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`count(distinct ${units.id})::int` })
      .from(units)
      .innerJoin(factions, eq(units.factionId, factions.id))
      .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
      .leftJoin(unitStats, eq(unitStats.unitId, units.id))
      .where(where);

    let filtered = rows;
    if (filters.specialty?.length) {
      const unitIds = rows.map((r) => r.id);
      if (unitIds.length === 0) {
        return { rows: [], total: 0 };
      }
      const specs = await db
        .select({
          unitId: unitSpecialties.unitId,
          slug: specialties.slug,
        })
        .from(unitSpecialties)
        .innerJoin(
          specialties,
          eq(unitSpecialties.specialtyId, specialties.id),
        )
        .where(inArray(unitSpecialties.unitId, unitIds));
      const byUnit = new Map<number, string[]>();
      for (const s of specs) {
        const list = byUnit.get(s.unitId) ?? [];
        list.push(s.slug);
        byUnit.set(s.unitId, list);
      }
      filtered = rows.filter((r) => {
        const slugs = byUnit.get(r.id) ?? [];
        return filters.specialty!.some((sp) => slugs.includes(sp));
      });
    }

    // Attach costs
    const ids = filtered.map((r) => r.id);
    const costs =
      ids.length === 0
        ? []
        : await db
            .select()
            .from(unitCosts)
            .where(inArray(unitCosts.unitId, ids));

    const costMap = new Map<number, { cp: number | null; resources: number | null }>();
    for (const c of costs) {
      const cur = costMap.get(c.unitId) ?? { cp: null, resources: null };
      if (c.kind === "cp") cur.cp = c.amount;
      if (c.kind === "resources") cur.resources = c.amount;
      costMap.set(c.unitId, cur);
    }

    const specialtyRows =
      ids.length === 0
        ? []
        : await db
            .select({
              unitId: unitSpecialties.unitId,
              slug: specialties.slug,
              nameEn: specialties.nameEn,
            })
            .from(unitSpecialties)
            .innerJoin(
              specialties,
              eq(unitSpecialties.specialtyId, specialties.id),
            )
            .where(inArray(unitSpecialties.unitId, ids));

    const specMap = new Map<number, { slug: string; nameEn: string }[]>();
    for (const s of specialtyRows) {
      const list = specMap.get(s.unitId) ?? [];
      list.push({ slug: s.slug, nameEn: s.nameEn });
      specMap.set(s.unitId, list);
    }

    const enriched = filtered.map((r) => ({
      ...r,
      costCp: costMap.get(r.id)?.cp ?? null,
      costResources: costMap.get(r.id)?.resources ?? null,
      specialties: specMap.get(r.id) ?? [],
    }));

    // Optional cost range filters (post-join)
    let finalRows = enriched;
    if (filters.helmetMin !== undefined) {
      finalRows = finalRows.filter(
        (r) => r.costCp !== null && r.costCp >= filters.helmetMin!,
      );
    }
    if (filters.helmetMax !== undefined) {
      finalRows = finalRows.filter(
        (r) => r.costCp !== null && r.costCp <= filters.helmetMax!,
      );
    }
    if (filters.shieldMin !== undefined) {
      finalRows = finalRows.filter(
        (r) =>
          r.costResources !== null && r.costResources >= filters.shieldMin!,
      );
    }
    if (filters.shieldMax !== undefined) {
      finalRows = finalRows.filter(
        (r) =>
          r.costResources !== null && r.costResources <= filters.shieldMax!,
      );
    }

    return { rows: finalRows, total: countRow?.count ?? 0 };
  } catch {
    console.error("Failed to list units");
    return { rows: [], total: 0 };
  }
}

export async function getUnitBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        id: units.id,
        slug: units.slug,
        name: units.name,
        shortName: units.shortName,
        descriptionEn: units.descriptionEn,
        tier: units.tier,
        notes: units.notes,
        squadSize: units.squadSize,
        crewSize: units.crewSize,
        confidence: units.confidence,
        bestAt: units.bestAt,
        weakAgainst: units.weakAgainst,
        factionSlug: factions.slug,
        factionName: factions.nameEn,
        factionColor: factions.color,
        typeCode: unitTypes.code,
        typeName: unitTypes.nameEn,
        category: unitTypes.category,
      })
      .from(units)
      .innerJoin(factions, eq(units.factionId, factions.id))
      .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
      .where(eq(units.slug, slug))
      .limit(1);

    if (!row) return null;

    const [stats] = await db
      .select()
      .from(unitStats)
      .where(eq(unitStats.unitId, row.id))
      .limit(1);

    const costs = await db
      .select()
      .from(unitCosts)
      .where(eq(unitCosts.unitId, row.id));

    const specs = await db
      .select({
        slug: specialties.slug,
        nameEn: specialties.nameEn,
      })
      .from(unitSpecialties)
      .innerJoin(specialties, eq(unitSpecialties.specialtyId, specialties.id))
      .where(eq(unitSpecialties.unitId, row.id));

    const weaponsRows = await db
      .select({
        weaponId: weapons.id,
        slug: weapons.slug,
        name: weapons.name,
        caliberMm: weapons.caliberMm,
        reloadS: weapons.reloadS,
        maxRangeM: weapons.maxRangeM,
        mount: unitWeapons.mount,
        quantity: unitWeapons.quantity,
      })
      .from(unitWeapons)
      .innerJoin(weapons, eq(unitWeapons.weaponId, weapons.id))
      .where(eq(unitWeapons.unitId, row.id));

    const weaponIds = weaponsRows.map((w) => w.weaponId);
    const ammoRows =
      weaponIds.length === 0
        ? []
        : await db
            .select({
              weaponId: weaponAmmo.weaponId,
              ammoId: ammoTypes.id,
              ammoSlug: ammoTypes.slug,
              ammoName: ammoTypes.name,
              kind: ammoTypes.kind,
              caliberMm: ammoTypes.caliberMm,
              isDefault: weaponAmmo.isDefault,
            })
            .from(weaponAmmo)
            .innerJoin(ammoTypes, eq(weaponAmmo.ammoTypeId, ammoTypes.id))
            .where(inArray(weaponAmmo.weaponId, weaponIds));

    const ammoIds = [...new Set(ammoRows.map((a) => a.ammoId))];
    const penRows =
      ammoIds.length === 0
        ? []
        : await db
            .select()
            .from(penetrationByRange)
            .where(inArray(penetrationByRange.ammoTypeId, ammoIds));

    return {
      ...row,
      stats: stats ?? null,
      costs,
      specialties: specs,
      weapons: weaponsRows.map((w) => ({
        ...w,
        ammo: ammoRows.filter((a) => a.weaponId === w.weaponId),
      })),
      penetration: penRows,
    };
  } catch {
    console.error("Failed to load unit");
    return null;
  }
}

export async function getUnitsBySlugs(slugs: string[]) {
  const unique = [...new Set(slugs)].slice(0, 4);
  if (unique.length === 0) return [];
  const results = await Promise.all(unique.map((s) => getUnitBySlug(s)));
  return results.filter(Boolean);
}

export async function getSearchIndex() {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: units.id,
        slug: units.slug,
        name: units.name,
        shortName: units.shortName,
        factionSlug: factions.slug,
        typeCode: unitTypes.code,
        typeName: unitTypes.nameEn,
      })
      .from(units)
      .innerJoin(factions, eq(units.factionId, factions.id))
      .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
      .orderBy(asc(units.name))
      .limit(2000);
    return rows;
  } catch {
    console.error("Failed to load search index");
    return [];
  }
}

export async function getResearchTree(factionSlug: string) {
  const db = getDb();
  if (!db) return { nodes: [], edges: [], faction: null };
  try {
    const faction = await getFactionBySlug(factionSlug);
    if (!faction) return { nodes: [], edges: [], faction: null };

    const nodes = await db
      .select()
      .from(researchNodes)
      .where(eq(researchNodes.factionId, faction.id));

    const nodeIds = nodes.map((n) => n.id);
    const edges =
      nodeIds.length === 0
        ? []
        : await db
            .select()
            .from(researchEdges)
            .where(inArray(researchEdges.fromNodeId, nodeIds));

    const nodeUnits =
      nodeIds.length === 0
        ? []
        : await db
            .select({
              nodeId: researchNodeUnits.nodeId,
              unitId: units.id,
              unitSlug: units.slug,
              unitName: units.name,
            })
            .from(researchNodeUnits)
            .innerJoin(units, eq(researchNodeUnits.unitId, units.id))
            .where(inArray(researchNodeUnits.nodeId, nodeIds));

    return {
      faction,
      nodes: nodes.map((n) => ({
        ...n,
        units: nodeUnits.filter((u) => u.nodeId === n.id),
      })),
      edges,
    };
  } catch {
    console.error("Failed to load research tree");
    return { nodes: [], edges: [], faction: null };
  }
}

export async function getFactionUnitCounts(factionId: number) {
  const db = getDb();
  if (!db) return [];
  try {
    return await db
      .select({
        typeCode: unitTypes.code,
        typeName: unitTypes.nameEn,
        count: sql<number>`count(${units.id})::int`,
      })
      .from(units)
      .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
      .where(eq(units.factionId, factionId))
      .groupBy(unitTypes.id)
      .orderBy(asc(unitTypes.nameEn));
  } catch {
    console.error("Failed to load faction unit counts");
    return [];
  }
}

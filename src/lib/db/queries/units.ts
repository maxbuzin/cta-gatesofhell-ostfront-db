import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db/client";
import {
  decodeCursor,
  describeKeysetPredicate,
  encodeCursor,
  type CursorSortKey,
} from "@/lib/db/keyset-cursor";
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

const SORT_MAP = {
  name_asc: { col: units.name, dir: "asc" as const, key: "name" as const },
  name_desc: { col: units.name, dir: "desc" as const, key: "name" as const },
  hp_asc: { col: unitStats.hp, dir: "asc" as const, key: "hp" as const },
  hp_desc: { col: unitStats.hp, dir: "desc" as const, key: "hp" as const },
  armor_asc: {
    col: unitStats.armorFrontMm,
    dir: "asc" as const,
    key: "armor" as const,
  },
  armor_desc: {
    col: unitStats.armorFrontMm,
    dir: "desc" as const,
    key: "armor" as const,
  },
  speed_asc: {
    col: unitStats.speedRoadKmh,
    dir: "asc" as const,
    key: "speed" as const,
  },
  speed_desc: {
    col: unitStats.speedRoadKmh,
    dir: "desc" as const,
    key: "speed" as const,
  },
  pen_asc: {
    col: unitStats.penetrationMm,
    dir: "asc" as const,
    key: "pen" as const,
  },
  pen_desc: {
    col: unitStats.penetrationMm,
    dir: "desc" as const,
    key: "pen" as const,
  },
} as const;

export type SortKey = keyof typeof SORT_MAP;

async function currentVersionId(): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ id: gameVersions.id })
    .from(gameVersions)
    .where(eq(gameVersions.isCurrent, true))
    .limit(1);
  return row?.id ?? null;
}

export async function getUnitCountsByType(): Promise<
  { code: string; nameEn: string; count: number }[]
> {
  "use cache";
  cacheLife("max");
  cacheTag("units", "home");
  const db = getDb();
  if (!db) return [];
  return await db
    .select({
      code: unitTypes.code,
      nameEn: unitTypes.nameEn,
      count: sql<number>`count(${units.id})::int`,
    })
    .from(unitTypes)
    .leftJoin(units, eq(units.unitTypeId, unitTypes.id))
    .groupBy(unitTypes.id)
    .orderBy(asc(unitTypes.nameEn));
}

export async function getFactions() {
  "use cache";
  cacheLife("max");
  cacheTag("factions");
  const db = getDb();
  if (!db) return [];
  return await db.select().from(factions).orderBy(asc(factions.sortOrder));
}

export async function getFactionBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("factions", `faction:${slug}`);
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(factions)
    .where(eq(factions.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getSpecialties() {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  const db = getDb();
  if (!db) return [];
  return await db.select().from(specialties).orderBy(asc(specialties.nameEn));
}

export async function getCurrentGameVersion() {
  "use cache";
  cacheLife("max");
  cacheTag("patches");
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(gameVersions)
    .where(eq(gameVersions.isCurrent, true))
    .limit(1);
  return row ?? null;
}

export async function getPopularComparisons() {
  "use cache";
  cacheLife("max");
  cacheTag("home");
  const db = getDb();
  if (!db) return [];
  return await db
    .select()
    .from(popularComparisons)
    .orderBy(asc(popularComparisons.sortOrder));
}

export async function getSourcesList() {
  "use cache";
  cacheLife("max");
  cacheTag("sources");
  const db = getDb();
  if (!db) return [];
  return await db.select().from(sources).orderBy(asc(sources.title));
}

export async function getGameVersions() {
  "use cache";
  cacheLife("max");
  cacheTag("patches");
  const db = getDb();
  if (!db) return [];
  return await db
    .select()
    .from(gameVersions)
    .orderBy(desc(gameVersions.releasedAt));
}

export async function listUnits(filters: UnitListFilters) {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  const db = getDb();
  if (!db) {
    return { rows: [], total: 0, nextCursor: null as string | null };
  }

  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const sortKey = (
    filters.sort && filters.sort in SORT_MAP ? filters.sort : "name_asc"
  ) as CursorSortKey;
  const sort = SORT_MAP[sortKey];
  const cursor = decodeCursor(filters.cursor, sortKey);

  const versionId = await currentVersionId();
  const where = await buildListWhere(db, filters, versionId, cursor);
  const totalWhere = await buildListWhere(db, filters, versionId, null);
  const orderBy =
    sort.dir === "asc"
      ? [sql`${sort.col} ASC NULLS LAST`, asc(units.id)]
      : [sql`${sort.col} DESC NULLS LAST`, desc(units.id)];

  const statsJoin =
    versionId === null
      ? sql`false`
      : and(
          eq(unitStats.unitId, units.id),
          eq(unitStats.gameVersionId, versionId),
        );

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
    .leftJoin(unitStats, statsJoin)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize + 1);

  const [totalRow] = await db
    .select({ count: sql<number>`count(distinct ${units.id})::int` })
    .from(units)
    .innerJoin(factions, eq(units.factionId, factions.id))
    .innerJoin(unitTypes, eq(units.unitTypeId, unitTypes.id))
    .leftJoin(unitStats, statsJoin)
    .where(totalWhere);

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const ids = pageRows.map((r) => r.id);
  const costs =
    ids.length === 0 || versionId === null
      ? []
      : await db
          .select()
          .from(unitCosts)
          .where(
            and(
              inArray(unitCosts.unitId, ids),
              eq(unitCosts.gameVersionId, versionId),
              eq(unitCosts.gameMode, "conquest"),
            ),
          );

  const costMap = new Map<
    number,
    { cp: number | null; resources: number | null }
  >();
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

  const enriched = pageRows.map((r) => ({
    ...r,
    costCp: costMap.get(r.id)?.cp ?? null,
    costResources: costMap.get(r.id)?.resources ?? null,
    specialties: specMap.get(r.id) ?? [],
  }));

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1]!;
    const v =
      sort.key === "name"
        ? last.name
        : sort.key === "hp"
          ? last.hp
          : sort.key === "armor"
            ? last.armorFrontMm
            : sort.key === "speed"
              ? last.speedRoadKmh
              : last.penetrationMm;
      nextCursor = encodeCursor({
        id: last.id,
        v: v ?? null,
        k: sortKey,
      });
    }

  return {
    rows: enriched,
    total: totalRow?.count ?? 0,
    nextCursor,
  };
}

async function buildListWhere(
  db: NonNullable<ReturnType<typeof getDb>>,
  filters: UnitListFilters,
  versionId: number | null,
  cursor: ReturnType<typeof decodeCursor>,
): Promise<SQL | undefined> {
  const sortKey = (
    filters.sort && filters.sort in SORT_MAP ? filters.sort : "name_asc"
  ) as CursorSortKey;
  const sort = SORT_MAP[sortKey];
  const conditions: SQL[] = [];

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
  if (filters.specialty?.length) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(unitSpecialties)
          .innerJoin(
            specialties,
            eq(unitSpecialties.specialtyId, specialties.id),
          )
          .where(
            and(
              eq(unitSpecialties.unitId, units.id),
              inArray(specialties.slug, filters.specialty),
            ),
          ),
      ),
    );
  }
  if (versionId !== null) {
    if (filters.helmetMin !== undefined || filters.helmetMax !== undefined) {
      const costConds = [
        eq(unitCosts.unitId, units.id),
        eq(unitCosts.gameVersionId, versionId),
        eq(unitCosts.kind, "cp"),
        eq(unitCosts.gameMode, "conquest"),
      ];
      if (filters.helmetMin !== undefined) {
        costConds.push(gte(unitCosts.amount, filters.helmetMin));
      }
      if (filters.helmetMax !== undefined) {
        costConds.push(lte(unitCosts.amount, filters.helmetMax));
      }
      conditions.push(
        exists(
          db.select({ one: sql`1` }).from(unitCosts).where(and(...costConds)),
        ),
      );
    }
    if (filters.shieldMin !== undefined || filters.shieldMax !== undefined) {
      const costConds = [
        eq(unitCosts.unitId, units.id),
        eq(unitCosts.gameVersionId, versionId),
        eq(unitCosts.kind, "resources"),
        eq(unitCosts.gameMode, "conquest"),
      ];
      if (filters.shieldMin !== undefined) {
        costConds.push(gte(unitCosts.amount, filters.shieldMin));
      }
      if (filters.shieldMax !== undefined) {
        costConds.push(lte(unitCosts.amount, filters.shieldMax));
      }
      conditions.push(
        exists(
          db.select({ one: sql`1` }).from(unitCosts).where(and(...costConds)),
        ),
      );
    }
  }
  if (cursor) {
    const pred = describeKeysetPredicate(sort.dir, cursor);
    const idCmp = pred.idOp === ">" ? gt : lt;
    const valCmp = pred.valueOp === ">" ? gt : lt;
    const col = sort.col;

    if (pred.mode === "null-page") {
      conditions.push(and(isNull(col), idCmp(units.id, cursor.id))!);
    } else if (sort.key === "name") {
      const name = String(cursor.v);
      conditions.push(
        or(
          valCmp(units.name, name),
          and(eq(units.name, name), idCmp(units.id, cursor.id)),
          // name is NOT NULL — null branch unused but kept for predicate parity
        )!,
      );
    } else {
      const num = cursor.v as number;
      conditions.push(
        or(
          valCmp(col, num),
          and(eq(col, num), idCmp(units.id, cursor.id)),
          isNull(col),
        )!,
      );
    }
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function getUnitBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("units", `unit:${slug}`);
  const db = getDb();
  if (!db) return null;
  const versionId = await currentVersionId();
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

  const stats =
    versionId === null
      ? []
      : await db
          .select()
          .from(unitStats)
          .where(
            and(
              eq(unitStats.unitId, row.id),
              eq(unitStats.gameVersionId, versionId),
            ),
          )
          .limit(1);

  const costs =
    versionId === null
      ? []
      : await db
          .select()
          .from(unitCosts)
          .where(
            and(
              eq(unitCosts.unitId, row.id),
              eq(unitCosts.gameVersionId, versionId),
              eq(unitCosts.gameMode, "conquest"),
            ),
          );

  const specs = await db
    .select({
      slug: specialties.slug,
      nameEn: specialties.nameEn,
    })
    .from(unitSpecialties)
    .innerJoin(specialties, eq(unitSpecialties.specialtyId, specialties.id))
    .where(eq(unitSpecialties.unitId, row.id));

  const weaponsRows =
    versionId === null
      ? []
      : await db
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
          .where(
            and(
              eq(unitWeapons.unitId, row.id),
              eq(unitWeapons.gameVersionId, versionId),
            ),
          );

  const weaponIds = weaponsRows.map((w) => w.weaponId);
  const ammoRows =
    weaponIds.length === 0 || versionId === null
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
          .where(
            and(
              inArray(weaponAmmo.weaponId, weaponIds),
              eq(weaponAmmo.gameVersionId, versionId),
            ),
          );

  const ammoIds = [...new Set(ammoRows.map((a) => a.ammoId))];
  const penRows =
    ammoIds.length === 0 || versionId === null
      ? []
      : await db
          .select()
          .from(penetrationByRange)
          .where(
            and(
              inArray(penetrationByRange.ammoTypeId, ammoIds),
              eq(penetrationByRange.gameVersionId, versionId),
            ),
          );

  return {
    ...row,
    stats: stats[0] ?? null,
    costs,
    specialties: specs,
    weapons: weaponsRows.map((w) => ({
      ...w,
      ammo: ammoRows.filter((a) => a.weaponId === w.weaponId),
    })),
    penetration: penRows,
  };
}

export async function getUnitsBySlugs(slugs: string[]) {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  const unique = [
    ...new Set(
      slugs.filter((s) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(s)),
    ),
  ].slice(0, 4);
  if (unique.length === 0) return [];
  const db = getDb();
  if (!db) return [];
  const found = await db
    .select({ slug: units.slug })
    .from(units)
    .where(inArray(units.slug, unique));
  const order = new Map(unique.map((s, i) => [s, i]));
  const ordered = found
    .map((r) => r.slug)
    .sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  const results = await Promise.all(ordered.map((s) => getUnitBySlug(s)));
  return results.filter(Boolean);
}

export async function getSearchIndex() {
  "use cache";
  cacheLife("max");
  cacheTag("units", "home");
  const db = getDb();
  if (!db) return [];
  return await db
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
}

export async function getResearchTree(factionSlug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("research", `research:${factionSlug}`);
  const db = getDb();
  if (!db) return { nodes: [], edges: [], faction: null };
  const faction = await getFactionBySlug(factionSlug);
  if (!faction) return { nodes: [], edges: [], faction: null };

  const versionId = await currentVersionId();
  const nodes =
    versionId === null
      ? []
      : await db
          .select()
          .from(researchNodes)
          .where(
            and(
              eq(researchNodes.factionId, faction.id),
              eq(researchNodes.gameVersionId, versionId),
            ),
          );

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
}

export async function getFactionUnitCounts(factionId: number) {
  "use cache";
  cacheLife("max");
  cacheTag("factions");
  const db = getDb();
  if (!db) return [];
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
}

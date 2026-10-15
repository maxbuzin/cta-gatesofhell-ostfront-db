import "server-only";

import { neon } from "@neondatabase/serverless";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { parseRoute, type ResearchRoute } from "@/lib/research-route";
import type { UnitProfile } from "@/lib/unit-profile";
import { AMMO_KINDS, type UnitLoadout } from "@/lib/unit-loadout";
import * as schema from "@/lib/db/schema";
import {
  ammoTypes,
  factions,
  gameVersions,
  penetrationByRange,
  researchEdges,
  researchNodeUnits,
  researchNodes,
  researchSections,
  sources,
  unitCosts,
  unitStats,
  unitTypes,
  unitWeapons,
  units,
  weaponAmmo,
  weapons,
} from "@/lib/db/schema";

type Db = NeonHttpDatabase<typeof schema>;

export type WriteResult =
  | { ok: true; slug: string; researchSlug?: string; sectionId?: number }
  | { ok: false; status: number; error: string };

export type SectionPick = { id: number } | { name: string | null };

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

let writeDb: Db | null = null;

export function getWriteDb(): Db | null {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL) return null;
  const url = process.env.DATABASE_URL_ETL;
  if (!url) return null;
  let user = "";
  try {
    user = decodeURIComponent(new URL(url).username);
  } catch {
    return null;
  }
  if (user !== "goh_etl") return null;
  if (!writeDb) writeDb = drizzle(neon(url), { schema });
  return writeDb;
}

function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return SLUG.test(slug) ? slug : "";
}

function fold(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function cleanName(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 300);
}

async function ensureVersion(db: Db) {
  const [current] = await db
    .select({ id: gameVersions.id })
    .from(gameVersions)
    .where(eq(gameVersions.isCurrent, true))
    .limit(1);
  if (current) return current.id;
  const [any] = await db.select({ id: gameVersions.id }).from(gameVersions).limit(1);
  if (any) {
    await db.update(gameVersions).set({ isCurrent: true }).where(eq(gameVersions.id, any.id));
    return any.id;
  }
  const [created] = await db
    .insert(gameVersions)
    .values({ code: "manual", name: "manual", isCurrent: true })
    .returning({ id: gameVersions.id });
  return created.id;
}

async function ensureSource(db: Db) {
  const [row] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.kind, "manual_override"))
    .limit(1);
  if (row) return row.id;
  const [created] = await db
    .insert(sources)
    .values({
      kind: "manual_override",
      title: "Manual",
      retrievedAt: new Date(),
    })
    .returning({ id: sources.id });
  return created.id;
}

async function ensureType(db: Db) {
  const [named] = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.code, "infantry_squad"))
    .limit(1);
  if (named) return named.id;
  const [any] = await db.select({ id: unitTypes.id }).from(unitTypes).limit(1);
  if (any) return any.id;
  const [created] = await db
    .insert(unitTypes)
    .values({ code: "infantry_squad", category: "infantry", nameEn: "Infantry" })
    .returning({ id: unitTypes.id });
  return created.id;
}

function cleanSectionName(raw: string | null) {
  if (!raw) return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  return name || null;
}

function shifted<T>(rows: T[], index: number, dir: -1 | 1) {
  const next = index + dir;
  if (next < 0 || next >= rows.length) return null;
  const copy = rows.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

async function freeResearchSlug(db: Db, factionId: number, versionId: number, base: string) {
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db
      .select({ id: researchNodes.id })
      .from(researchNodes)
      .where(
        and(
          eq(researchNodes.factionId, factionId),
          eq(researchNodes.gameVersionId, versionId),
          eq(researchNodes.slug, slug),
        ),
      )
      .limit(1);
    if (!hit) return slug;
    slug = `${base.slice(0, 76)}-${n}`.replace(/-+$/g, "");
  }
  return slug;
}

async function resolveSection(
  db: Db,
  factionId: number,
  versionId: number,
  pick: SectionPick,
): Promise<{ ok: true; id: number } | { ok: false; status: number; error: string }> {
  if ("id" in pick) {
    const [row] = await db
      .select({ id: researchSections.id })
      .from(researchSections)
      .where(
        and(
          eq(researchSections.id, pick.id),
          eq(researchSections.factionId, factionId),
          eq(researchSections.gameVersionId, versionId),
        ),
      )
      .limit(1);
    if (!row) return { ok: false, status: 400, error: "Section was not found" };
    return { ok: true, id: row.id };
  }
  const [last] = await db
    .select({ sortOrder: researchSections.sortOrder })
    .from(researchSections)
    .where(
      and(eq(researchSections.factionId, factionId), eq(researchSections.gameVersionId, versionId)),
    )
    .orderBy(desc(researchSections.sortOrder))
    .limit(1);
  const [created] = await db
    .insert(researchSections)
    .values({
      factionId,
      gameVersionId: versionId,
      name: cleanSectionName(pick.name),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    })
    .returning({ id: researchSections.id });
  return { ok: true, id: created.id };
}

async function nextNodeSort(db: Db, sectionId: number) {
  const [last] = await db
    .select({ sortOrder: researchNodes.sortOrder })
    .from(researchNodes)
    .where(eq(researchNodes.sectionId, sectionId))
    .orderBy(desc(researchNodes.sortOrder))
    .limit(1);
  return (last?.sortOrder ?? -1) + 1;
}

async function factionBySlug(db: Db, slug: string) {
  const [row] = await db
    .select({ id: factions.id, slug: factions.slug })
    .from(factions)
    .where(eq(factions.slug, slug))
    .limit(1);
  return row ?? null;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export async function createFaction(nameRaw: string, colorRaw: string): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const name = cleanName(nameRaw);
  const slug = slugify(name);
  const color = colorRaw.trim();
  if (!name || !slug) return { ok: false, status: 400, error: "Name is required" };
  if (!HEX.test(color)) return { ok: false, status: 400, error: "Color must be #RRGGBB" };
  const [existing] = await db
    .select({ id: factions.id })
    .from(factions)
    .where(eq(factions.slug, slug))
    .limit(1);
  if (existing) return { ok: false, status: 409, error: "Faction already exists" };
  const [last] = await db
    .select({ sortOrder: factions.sortOrder })
    .from(factions)
    .orderBy(desc(factions.sortOrder))
    .limit(1);
  await db.insert(factions).values({
    slug,
    nameEn: name,
    color,
    sortOrder: (last?.sortOrder ?? 0) + 1,
  });
  return { ok: true, slug };
}

function cleanOptionalText(value: string | null) {
  if (value == null) return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  if (text.length > 4000) return undefined;
  return text;
}

async function writeAmount(
  db: Db,
  unitId: number,
  versionId: number,
  sourceId: number,
  kind: "cp" | "resources",
  value: number | null,
) {
  const where = and(
    eq(unitCosts.unitId, unitId),
    eq(unitCosts.gameVersionId, versionId),
    eq(unitCosts.gameMode, "conquest"),
    eq(unitCosts.kind, kind),
  );
  if (value == null) {
    await db.delete(unitCosts).where(where);
    return true;
  }
  const amount = statNumber(value, 2_000_000_000, 0);
  if (amount == null) return false;
  const [existing] = await db.select({ id: unitCosts.id }).from(unitCosts).where(where).limit(1);
  if (existing) {
    await db.update(unitCosts).set({ amount }).where(eq(unitCosts.id, existing.id));
  } else {
    await db.insert(unitCosts).values({
      unitId,
      gameVersionId: versionId,
      gameMode: "conquest",
      kind,
      amount,
      sourceId,
    });
  }
  return true;
}

export async function applyUnitProfile(
  db: Db,
  unit: { id: number; slug: string },
  profile: UnitProfile,
): Promise<WriteResult> {
  const name = cleanName(profile.name);
  if (!name) return { ok: false, status: 400, error: "Name is required" };
  const hp = statNumber(profile.hp, 2_000_000_000, 0);
  const armor = statNumber(profile.armor, 32767, 0);
  const speed = statNumber(profile.speed, 999.9, 1);
  const reload = statNumber(profile.reload, 999.99, 2);
  const penetration = statNumber(profile.penetration, 99999.9, 1);
  const cp = statNumber(profile.cp, 2_000_000_000, 0);
  const cost = statNumber(profile.cost, 2_000_000_000, 0);
  if (
    hp === undefined ||
    armor === undefined ||
    speed === undefined ||
    reload === undefined ||
    penetration === undefined ||
    cp === undefined ||
    cost === undefined
  ) {
    return { ok: false, status: 400, error: "Invalid number" };
  }
  const bestAt = cleanOptionalText(profile.bestAt);
  const weakAgainst = cleanOptionalText(profile.weakAgainst);
  const description = cleanOptionalText(profile.description);
  if (bestAt === undefined || weakAgainst === undefined || description === undefined) {
    return { ok: false, status: 400, error: "Invalid text" };
  }
  await db
    .update(units)
    .set({
      name,
      searchName: fold(name) || unit.slug,
      descriptionEn: description,
      bestAt,
      weakAgainst,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unit.id));
  const versionId = await ensureVersion(db);
  const sourceId = await ensureSource(db);
  const where = and(eq(unitStats.unitId, unit.id), eq(unitStats.gameVersionId, versionId));
  const [existing] = await db.select({ id: unitStats.id }).from(unitStats).where(where).limit(1);
  const stats = {
    hp,
    armorFrontMm: armor,
    speedRoadKmh: speed,
    reloadS: reload,
    penetrationMm: penetration,
  };
  if (existing) {
    await db.update(unitStats).set(stats).where(eq(unitStats.id, existing.id));
  } else if (hp != null || armor != null || speed != null || reload != null || penetration != null) {
    await db.insert(unitStats).values({
      unitId: unit.id,
      gameVersionId: versionId,
      sourceId,
      ...stats,
    });
  }
  const cpOk = await writeAmount(db, unit.id, versionId, sourceId, "cp", cp);
  const costOk = await writeAmount(db, unit.id, versionId, sourceId, "resources", cost);
  if (!cpOk || !costOk) return { ok: false, status: 400, error: "Invalid number" };
  return { ok: true, slug: unit.slug };
}

export async function createUnit(
  factionSlug: string,
  nameRaw: string,
  section: SectionPick,
  draft: Omit<UnitProfile, "name"> | null = null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const name = cleanName(nameRaw);
  const base = slugify(name);
  if (!name || !base) return { ok: false, status: 400, error: "Name is required" };
  const typeId = await ensureType(db);
  const versionId = await ensureVersion(db);
  const placed = await resolveSection(db, faction.id, versionId, section);
  if (!placed.ok) return placed;
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db.select({ id: units.id }).from(units).where(eq(units.slug, slug)).limit(1);
    if (!hit) break;
    slug = `${base.slice(0, 76)}-${n}`.replace(/-+$/g, "");
  }
  const [unit] = await db
    .insert(units)
    .values({
      slug,
      name,
      searchName: fold(name) || slug,
      factionId: faction.id,
      unitTypeId: typeId,
    })
    .returning({ id: units.id });
  const nodeSlug = await freeResearchSlug(db, faction.id, versionId, base);
  const [node] = await db
    .insert(researchNodes)
    .values({
      factionId: faction.id,
      gameVersionId: versionId,
      slug: nodeSlug,
      name,
      sectionId: placed.id,
      sortOrder: await nextNodeSort(db, placed.id),
    })
    .returning({ id: researchNodes.id });
  await db.insert(researchNodeUnits).values({ nodeId: node.id, unitId: unit.id });
  if (draft) {
    const applied = await applyUnitProfile(db, { id: unit.id, slug }, { name, ...draft });
    if (!applied.ok) return applied;
  }
  return { ok: true, slug, researchSlug: nodeSlug };
}

async function resolveParents(
  db: Db,
  factionId: number,
  versionId: number,
  parentSlugs: string[],
): Promise<{ ok: true; ids: number[] } | { ok: false; status: number; error: string }> {
  const slugs = parentSlugs.filter(Boolean);
  if (new Set(slugs).size !== slugs.length) {
    return { ok: false, status: 400, error: "Duplicate previous research" };
  }
  if (!slugs.length) return { ok: true, ids: [] };
  const rows = await db
    .select({ id: researchNodes.id, slug: researchNodes.slug })
    .from(researchNodes)
    .where(
      and(
        eq(researchNodes.factionId, factionId),
        eq(researchNodes.gameVersionId, versionId),
        inArray(researchNodes.slug, slugs),
      ),
    );
  if (rows.length !== slugs.length) {
    return { ok: false, status: 400, error: "Previous research was not found" };
  }
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  return { ok: true, ids: slugs.map((item) => bySlug.get(item)!) };
}

async function parentIsDownstream(db: Db, factionId: number, versionId: number, nodeId: number, parentIds: number[]) {
  const nodes = await db
    .select({ id: researchNodes.id })
    .from(researchNodes)
    .where(and(eq(researchNodes.factionId, factionId), eq(researchNodes.gameVersionId, versionId)));
  const ids = nodes.map((row) => row.id);
  if (!ids.length || !parentIds.length) return false;
  const edges = await db
    .select({ fromNodeId: researchEdges.fromNodeId, toNodeId: researchEdges.toNodeId })
    .from(researchEdges)
    .where(inArray(researchEdges.fromNodeId, ids));
  const children = new Map<number, number[]>();
  for (const edge of edges) {
    if (edge.toNodeId === nodeId) continue;
    const list = children.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    children.set(edge.fromNodeId, list);
  }
  const targets = new Set(parentIds);
  const seen = new Set<number>();
  const stack = [...(children.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (targets.has(id)) return true;
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return false;
}

export async function createResearch(
  factionSlug: string,
  nameRaw: string,
  parentSlugs: string[],
  researchCost: number | null,
  section: SectionPick,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const name = cleanName(nameRaw);
  const base = slugify(name);
  if (!name || !base) return { ok: false, status: 400, error: "Name is required" };
  const versionId = await ensureVersion(db);
  const slug = await freeResearchSlug(db, faction.id, versionId, base);
  const parents = await resolveParents(db, faction.id, versionId, parentSlugs);
  if (!parents.ok) return parents;
  const placed = await resolveSection(db, faction.id, versionId, section);
  if (!placed.ok) return placed;
  const [created] = await db
    .insert(researchNodes)
    .values({
      factionId: faction.id,
      gameVersionId: versionId,
      slug,
      name,
      researchCost: researchCost == null ? null : Math.round(researchCost),
      sectionId: placed.id,
      sortOrder: await nextNodeSort(db, placed.id),
    })
    .returning({ id: researchNodes.id });
  if (parents.ids.length) {
    await db.insert(researchEdges).values(
      parents.ids.map((fromNodeId) => ({
        fromNodeId,
        toNodeId: created.id,
        kind: "requires",
      })),
    );
  }
  return { ok: true, slug, sectionId: placed.id };
}

async function unitRow(db: Db, slug: string) {
  const [row] = await db
    .select({ id: units.id, slug: units.slug, factionId: units.factionId })
    .from(units)
    .where(eq(units.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function saveUnitProfile(slug: string, profile: UnitProfile): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const unit = await unitRow(db, slug);
  if (!unit) return { ok: false, status: 404, error: "Unit not found" };
  return applyUnitProfile(db, unit, profile);
}

function statNumber(value: number | null, max: number, digits: number) {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0 || value > max) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function patchUnitStat(
  slug: string,
  field: "name" | "cp" | "cost" | "speed" | "reload" | "penetration" | "armor",
  value: string | number | null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const unit = await unitRow(db, slug);
  if (!unit) return { ok: false, status: 404, error: "Unit not found" };
  if (field === "name") {
    if (typeof value !== "string") return { ok: false, status: 400, error: "Invalid name" };
    const name = cleanName(value);
    if (!name) return { ok: false, status: 400, error: "Name is required" };
    await db
      .update(units)
      .set({ name, searchName: fold(name) || slug, updatedAt: new Date() })
      .where(eq(units.id, unit.id));
    return { ok: true, slug };
  }
  if (value !== null && typeof value !== "number") {
    return { ok: false, status: 400, error: "Invalid number" };
  }
  const versionId = await ensureVersion(db);
  const sourceId = await ensureSource(db);
  if (field === "cp" || field === "cost") {
    const kind = field === "cp" ? "cp" : "resources";
    const where = and(
      eq(unitCosts.unitId, unit.id),
      eq(unitCosts.gameVersionId, versionId),
      eq(unitCosts.gameMode, "conquest"),
      eq(unitCosts.kind, kind),
    );
    if (value == null) {
      await db.delete(unitCosts).where(where);
      return { ok: true, slug };
    }
    const amount = statNumber(value, 2_000_000_000, 0);
    if (amount == null) return { ok: false, status: 400, error: "Invalid number" };
    const [existing] = await db.select({ id: unitCosts.id }).from(unitCosts).where(where).limit(1);
    if (existing) {
      await db.update(unitCosts).set({ amount }).where(eq(unitCosts.id, existing.id));
    } else {
      await db.insert(unitCosts).values({
        unitId: unit.id,
        gameVersionId: versionId,
        gameMode: "conquest",
        kind,
        amount,
        sourceId,
      });
    }
    return { ok: true, slug };
  }
  const column =
    field === "speed"
      ? "speedRoadKmh"
      : field === "reload"
        ? "reloadS"
        : field === "penetration"
          ? "penetrationMm"
          : "armorFrontMm";
  const digits = field === "reload" ? 2 : field === "armor" ? 0 : 1;
  const max = field === "armor" ? 32767 : field === "reload" ? 999.99 : field === "speed" ? 999.9 : 99999.9;
  const next = statNumber(value, max, digits);
  if (next === undefined) return { ok: false, status: 400, error: "Invalid number" };
  const where = and(eq(unitStats.unitId, unit.id), eq(unitStats.gameVersionId, versionId));
  const [existing] = await db.select({ id: unitStats.id }).from(unitStats).where(where).limit(1);
  if (existing) {
    await db.update(unitStats).set({ [column]: next }).where(eq(unitStats.id, existing.id));
  } else {
    await db.insert(unitStats).values({
      unitId: unit.id,
      gameVersionId: versionId,
      sourceId,
      [column]: next,
    });
  }
  return { ok: true, slug };
}

async function researchRow(db: Db, factionSlug: string, nodeSlug: string) {
  const versionId = await ensureVersion(db);
  const [row] = await db
    .select({
      id: researchNodes.id,
      factionId: researchNodes.factionId,
      slug: researchNodes.slug,
      sectionId: researchNodes.sectionId,
    })
    .from(researchNodes)
    .innerJoin(factions, eq(researchNodes.factionId, factions.id))
    .where(
      and(
        eq(factions.slug, factionSlug),
        eq(researchNodes.gameVersionId, versionId),
        eq(researchNodes.slug, nodeSlug),
      ),
    )
    .limit(1);
  return row ? { ...row, versionId } : null;
}

export async function patchResearchNode(
  factionSlug: string,
  nodeSlug: string,
  field: "name" | "cost",
  value: string | number | null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  if (field === "name") {
    if (typeof value !== "string") return { ok: false, status: 400, error: "Invalid name" };
    const name = cleanName(value);
    if (!name) return { ok: false, status: 400, error: "Name is required" };
    await db.update(researchNodes).set({ name }).where(eq(researchNodes.id, node.id));
    return { ok: true, slug: node.slug };
  }
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 2_000_000_000)) {
    return { ok: false, status: 400, error: "Invalid number" };
  }
  await db
    .update(researchNodes)
    .set({ researchCost: value == null ? null : Math.round(value) })
    .where(eq(researchNodes.id, node.id));
  return { ok: true, slug: node.slug };
}

export async function setResearchParent(
  factionSlug: string,
  nodeSlug: string,
  parentSlugs: string[],
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  const parents = await resolveParents(db, node.factionId, node.versionId, parentSlugs);
  if (!parents.ok) return parents;
  if (parents.ids.includes(node.id)) {
    return { ok: false, status: 400, error: "Research cannot require itself" };
  }
  if (await parentIsDownstream(db, node.factionId, node.versionId, node.id, parents.ids)) {
    return { ok: false, status: 400, error: "That research already comes after this one" };
  }
  await db.delete(researchEdges).where(eq(researchEdges.toNodeId, node.id));
  if (parents.ids.length) {
    await db.insert(researchEdges).values(
      parents.ids.map((fromNodeId) => ({
        fromNodeId,
        toNodeId: node.id,
        kind: "requires",
      })),
    );
  }
  return { ok: true, slug: node.slug };
}

export async function moveResearchSection(
  factionSlug: string,
  sectionId: number,
  dir: "up" | "down",
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const versionId = await ensureVersion(db);
  const rows = await db
    .select({ id: researchSections.id })
    .from(researchSections)
    .where(
      and(eq(researchSections.factionId, faction.id), eq(researchSections.gameVersionId, versionId)),
    )
    .orderBy(asc(researchSections.sortOrder), asc(researchSections.id));
  const index = rows.findIndex((row) => row.id === sectionId);
  if (index < 0) return { ok: false, status: 404, error: "Section was not found" };
  const next = shifted(rows, index, dir === "up" ? -1 : 1);
  if (!next) return { ok: true, slug: factionSlug };
  for (let i = 0; i < next.length; i++) {
    await db.update(researchSections).set({ sortOrder: i }).where(eq(researchSections.id, next[i].id));
  }
  return { ok: true, slug: factionSlug };
}

export async function renameResearchSection(
  factionSlug: string,
  sectionId: number,
  nameRaw: string | null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const versionId = await ensureVersion(db);
  const [row] = await db
    .select({ id: researchSections.id })
    .from(researchSections)
    .where(
      and(
        eq(researchSections.id, sectionId),
        eq(researchSections.factionId, faction.id),
        eq(researchSections.gameVersionId, versionId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, status: 404, error: "Section was not found" };
  await db
    .update(researchSections)
    .set({ name: cleanSectionName(nameRaw) })
    .where(eq(researchSections.id, row.id));
  return { ok: true, slug: factionSlug };
}

export async function deleteResearchNode(factionSlug: string, nodeSlug: string): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  await db.delete(researchNodes).where(eq(researchNodes.id, node.id));
  return { ok: true, slug: factionSlug };
}

export async function deleteResearchSection(factionSlug: string, sectionId: number): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 404, error: "Section was not found" };
  const versionId = await ensureVersion(db);
  const [row] = await db
    .select({ id: researchSections.id })
    .from(researchSections)
    .where(
      and(
        eq(researchSections.id, sectionId),
        eq(researchSections.factionId, faction.id),
        eq(researchSections.gameVersionId, versionId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, status: 404, error: "Section was not found" };
  const cards = await db
    .select({ id: researchNodes.id })
    .from(researchNodes)
    .where(eq(researchNodes.sectionId, row.id));
  if (cards.length) {
    await db.delete(researchNodes).where(
      inArray(
        researchNodes.id,
        cards.map((card) => card.id),
      ),
    );
  }
  await db.delete(researchSections).where(eq(researchSections.id, row.id));
  return { ok: true, slug: factionSlug };
}

export async function deleteUnit(unitSlug: string): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const unit = await unitRow(db, unitSlug);
  if (!unit) return { ok: false, status: 404, error: "Unit not found" };
  const links = await db
    .select({ nodeId: researchNodeUnits.nodeId })
    .from(researchNodeUnits)
    .where(eq(researchNodeUnits.unitId, unit.id));
  const nodeIds = links.map((link) => link.nodeId);
  if (nodeIds.length) {
    const mates = await db
      .select({ nodeId: researchNodeUnits.nodeId, unitId: researchNodeUnits.unitId })
      .from(researchNodeUnits)
      .where(inArray(researchNodeUnits.nodeId, nodeIds));
    const drop = nodeIds.filter((id) => mates.every((mate) => mate.nodeId !== id || mate.unitId === unit.id));
    if (drop.length) await db.delete(researchNodes).where(inArray(researchNodes.id, drop));
  }
  await db.delete(units).where(eq(units.id, unit.id));
  return { ok: true, slug: unitSlug };
}

export async function placeResearchGrid(
  factionSlug: string,
  cards: { nodeSlug: string; column: number; row: number }[],
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  if (!cards.length || cards.length > 200) return { ok: false, status: 400, error: "Invalid grid" };
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const card of cards) {
    if (!Number.isInteger(card.column) || !Number.isInteger(card.row)) {
      return { ok: false, status: 400, error: "Invalid grid" };
    }
    if (card.column < 0 || card.row < 0 || card.column > 48 || card.row > 48) {
      return { ok: false, status: 400, error: "Invalid grid" };
    }
    const key = `${card.column}:${card.row}`;
    if (seen.has(key)) return { ok: false, status: 400, error: "Invalid grid" };
    seen.add(key);
    slugs.push(card.nodeSlug);
  }
  if (new Set(slugs).size !== slugs.length) return { ok: false, status: 400, error: "Invalid grid" };
  const versionId = await ensureVersion(db);
  const rows = await db
    .select({
      id: researchNodes.id,
      slug: researchNodes.slug,
      sectionId: researchNodes.sectionId,
    })
    .from(researchNodes)
    .innerJoin(factions, eq(researchNodes.factionId, factions.id))
    .where(
      and(
        eq(factions.slug, factionSlug),
        eq(researchNodes.gameVersionId, versionId),
        inArray(researchNodes.slug, slugs),
      ),
    );
  if (rows.length !== cards.length) return { ok: false, status: 404, error: "Research not found" };
  const sectionId = rows[0]?.sectionId;
  if (sectionId == null || rows.some((row) => row.sectionId !== sectionId)) {
    return { ok: false, status: 400, error: "Pick a section first" };
  }
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  for (const card of cards) {
    const row = bySlug.get(card.nodeSlug);
    if (!row) return { ok: false, status: 404, error: "Research not found" };
    await db
      .update(researchNodes)
      .set({ column: card.column, row: card.row })
      .where(eq(researchNodes.id, row.id));
  }
  return { ok: true, slug: factionSlug };
}

export async function placeResearchRoutes(
  factionSlug: string,
  edges: { fromSlug: string; toSlug: string; route: ResearchRoute | null }[],
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  if (!edges.length || edges.length > 200) return { ok: false, status: 400, error: "Invalid route" };
  const slugs = [...new Set(edges.flatMap((edge) => [edge.fromSlug, edge.toSlug]))];
  const versionId = await ensureVersion(db);
  const rows = await db
    .select({ id: researchNodes.id, slug: researchNodes.slug })
    .from(researchNodes)
    .innerJoin(factions, eq(researchNodes.factionId, factions.id))
    .where(
      and(
        eq(factions.slug, factionSlug),
        eq(researchNodes.gameVersionId, versionId),
        inArray(researchNodes.slug, slugs),
      ),
    );
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  for (const edge of edges) {
    const route = edge.route == null ? null : parseRoute(edge.route);
    if (edge.route != null && !route) return { ok: false, status: 400, error: "Invalid route" };
    const fromNodeId = bySlug.get(edge.fromSlug);
    const toNodeId = bySlug.get(edge.toSlug);
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return { ok: false, status: 404, error: "Research not found" };
    }
    const updated = await db
      .update(researchEdges)
      .set({ route })
      .where(and(eq(researchEdges.fromNodeId, fromNodeId), eq(researchEdges.toNodeId, toNodeId)))
      .returning({ fromNodeId: researchEdges.fromNodeId });
    if (!updated.length) return { ok: false, status: 404, error: "Research not found" };
  }
  return { ok: true, slug: factionSlug };
}

export async function createResearchSection(factionSlug: string): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const versionId = await ensureVersion(db);
  const placed = await resolveSection(db, faction.id, versionId, { name: null });
  if (!placed.ok) return placed;
  return { ok: true, slug: factionSlug };
}

export async function moveResearchNode(
  factionSlug: string,
  nodeSlug: string,
  dir: "left" | "right",
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  if (node.sectionId == null) return { ok: false, status: 400, error: "Pick a section first" };
  const rows = await db
    .select({ id: researchNodes.id })
    .from(researchNodes)
    .where(eq(researchNodes.sectionId, node.sectionId))
    .orderBy(asc(researchNodes.sortOrder), asc(researchNodes.name), asc(researchNodes.id));
  const index = rows.findIndex((row) => row.id === node.id);
  if (index < 0) return { ok: false, status: 404, error: "Research not found" };
  const next = shifted(rows, index, dir === "left" ? -1 : 1);
  if (!next) return { ok: true, slug: node.slug };
  for (let i = 0; i < next.length; i++) {
    await db.update(researchNodes).set({ sortOrder: i }).where(eq(researchNodes.id, next[i].id));
  }
  return { ok: true, slug: node.slug };
}

export async function setResearchSection(
  factionSlug: string,
  nodeSlug: string,
  sectionId: number,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  const placed = await resolveSection(db, node.factionId, node.versionId, { id: sectionId });
  if (!placed.ok) return placed;
  if (node.sectionId === placed.id) return { ok: true, slug: node.slug };
  await db
    .update(researchNodes)
    .set({ sectionId: placed.id, sortOrder: await nextNodeSort(db, placed.id) })
    .where(eq(researchNodes.id, node.id));
  return { ok: true, slug: node.slug };
}

function ammoSlug(unitSlug: string, kind: string, n = 1) {
  const tail = n === 1 ? kind.toLowerCase() : `${kind.toLowerCase()}-${n}`;
  return `${unitSlug.slice(0, 78 - tail.length)}-${tail}`;
}

async function freeWeaponSlug(db: Db, base: string) {
  let slug = base.slice(0, 80);
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db.select({ id: weapons.id }).from(weapons).where(eq(weapons.slug, slug)).limit(1);
    if (!hit) return slug;
    slug = `${base.slice(0, 76)}-${n}`;
  }
  return `${base.slice(0, 64)}-manual`;
}

async function ensureWeapon(
  db: Db,
  unit: { id: number; slug: string; name: string },
  versionId: number,
) {
  const rows = await db
    .select({ id: weapons.id, mount: unitWeapons.mount })
    .from(unitWeapons)
    .innerJoin(weapons, eq(unitWeapons.weaponId, weapons.id))
    .where(and(eq(unitWeapons.unitId, unit.id), eq(unitWeapons.gameVersionId, versionId)));
  const found = rows.find((row) => row.mount === "main") ?? rows[0];
  if (found) return found.id;
  const slug = await freeWeaponSlug(db, unit.slug);
  const [created] = await db
    .insert(weapons)
    .values({ slug, name: unit.name })
    .returning({ id: weapons.id });
  await db.insert(unitWeapons).values({
    unitId: unit.id,
    weaponId: created.id,
    gameVersionId: versionId,
    mount: "main",
  });
  return created.id;
}

async function ownAmmo(db: Db, unitSlug: string, weaponId: number, kind: UnitLoadout["ammo"][number]["kind"]) {
  for (let n = 1; n < 20; n++) {
    const slug = ammoSlug(unitSlug, kind, n);
    const [row] = await db.select({ id: ammoTypes.id }).from(ammoTypes).where(eq(ammoTypes.slug, slug)).limit(1);
    if (!row) {
      const [created] = await db
        .insert(ammoTypes)
        .values({ slug, name: kind, kind })
        .returning({ id: ammoTypes.id });
      return created.id;
    }
    const [other] = await db
      .select({ weaponId: weaponAmmo.weaponId })
      .from(weaponAmmo)
      .where(and(eq(weaponAmmo.ammoTypeId, row.id), ne(weaponAmmo.weaponId, weaponId)))
      .limit(1);
    if (other) continue;
    await db.update(ammoTypes).set({ name: kind, kind }).where(eq(ammoTypes.id, row.id));
    return row.id;
  }
  return null;
}

async function resolveType(
  db: Db,
  loadout: UnitLoadout,
): Promise<{ ok: true; id: number } | { ok: false; status: number; error: string }> {
  if (loadout.typeCode) {
    const [row] = await db
      .select({ id: unitTypes.id })
      .from(unitTypes)
      .where(eq(unitTypes.code, loadout.typeCode))
      .limit(1);
    if (!row) return { ok: false, status: 400, error: "Unknown type" };
    return { ok: true, id: row.id };
  }
  const name = cleanName(loadout.typeName || "").slice(0, 80);
  if (!name || !loadout.typeCategory) return { ok: false, status: 400, error: "Type is required" };
  const [named] = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.nameEn, name))
    .limit(1);
  if (named) return { ok: true, id: named.id };
  const base = slugify(name);
  if (!base) return { ok: false, status: 400, error: "Invalid type" };
  let code = base;
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db
      .select({ id: unitTypes.id, nameEn: unitTypes.nameEn })
      .from(unitTypes)
      .where(eq(unitTypes.code, code))
      .limit(1);
    if (!hit) break;
    if (fold(hit.nameEn) === fold(name)) return { ok: true, id: hit.id };
    code = `${base.slice(0, 76)}-${n}`;
  }
  const [created] = await db
    .insert(unitTypes)
    .values({ code, category: loadout.typeCategory, nameEn: name })
    .returning({ id: unitTypes.id });
  return { ok: true, id: created.id };
}

export async function saveUnitLoadout(slug: string, loadout: UnitLoadout): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const [unit] = await db
    .select({ id: units.id, slug: units.slug, name: units.name })
    .from(units)
    .where(eq(units.slug, slug))
    .limit(1);
  if (!unit) return { ok: false, status: 404, error: "Unit not found" };
  const type = await resolveType(db, loadout);
  if (!type.ok) return type;
  await db
    .update(units)
    .set({ unitTypeId: type.id, updatedAt: new Date() })
    .where(eq(units.id, unit.id));
  const versionId = await ensureVersion(db);
  const sourceId = await ensureSource(db);
  const weaponId = await ensureWeapon(db, unit, versionId);
  await db
    .delete(weaponAmmo)
    .where(and(eq(weaponAmmo.weaponId, weaponId), eq(weaponAmmo.gameVersionId, versionId)));
  const keep = new Set(loadout.ammo.map((row) => row.kind));
  for (const kind of AMMO_KINDS) {
    if (keep.has(kind)) continue;
    const [row] = await db
      .select({ id: ammoTypes.id })
      .from(ammoTypes)
      .where(eq(ammoTypes.slug, ammoSlug(unit.slug, kind)))
      .limit(1);
    if (!row) continue;
    const [other] = await db
      .select({ weaponId: weaponAmmo.weaponId })
      .from(weaponAmmo)
      .where(and(eq(weaponAmmo.ammoTypeId, row.id), ne(weaponAmmo.weaponId, weaponId)))
      .limit(1);
    if (other) continue;
    await db
      .delete(penetrationByRange)
      .where(
        and(
          eq(penetrationByRange.ammoTypeId, row.id),
          eq(penetrationByRange.gameVersionId, versionId),
          eq(penetrationByRange.angleDeg, 0),
        ),
      );
  }
  for (const [index, shell] of loadout.ammo.entries()) {
    const ammoId = await ownAmmo(db, unit.slug, weaponId, shell.kind);
    if (ammoId == null) return { ok: false, status: 400, error: "Invalid ammo" };
    await db
      .delete(penetrationByRange)
      .where(
        and(
          eq(penetrationByRange.ammoTypeId, ammoId),
          eq(penetrationByRange.gameVersionId, versionId),
          eq(penetrationByRange.angleDeg, 0),
        ),
      );
    await db.insert(penetrationByRange).values(
      shell.points.map((point) => ({
        ammoTypeId: ammoId,
        gameVersionId: versionId,
        rangeM: point.rangeM,
        angleDeg: 0,
        penetrationMm: point.mm,
        sourceId,
      })),
    );
    await db.insert(weaponAmmo).values({
      weaponId,
      ammoTypeId: ammoId,
      gameVersionId: versionId,
      isDefault: index === 0,
    });
  }
  if (loadout.ammo.length === 0) {
    const [weapon] = await db
      .select({
        caliberMm: weapons.caliberMm,
        rateOfFireRpm: weapons.rateOfFireRpm,
        maxRangeM: weapons.maxRangeM,
        reloadS: weapons.reloadS,
      })
      .from(weapons)
      .where(eq(weapons.id, weaponId))
      .limit(1);
    const [ammoLeft] = await db
      .select({ weaponId: weaponAmmo.weaponId })
      .from(weaponAmmo)
      .where(eq(weaponAmmo.weaponId, weaponId))
      .limit(1);
    const [otherUnit] = await db
      .select({ unitId: unitWeapons.unitId })
      .from(unitWeapons)
      .where(and(eq(unitWeapons.weaponId, weaponId), ne(unitWeapons.unitId, unit.id)))
      .limit(1);
    const blank =
      weapon &&
      weapon.caliberMm == null &&
      weapon.rateOfFireRpm == null &&
      weapon.maxRangeM == null &&
      weapon.reloadS == null &&
      !ammoLeft &&
      !otherUnit;
    if (blank) {
      await db
        .delete(unitWeapons)
        .where(and(eq(unitWeapons.unitId, unit.id), eq(unitWeapons.weaponId, weaponId)));
      await db.delete(weapons).where(eq(weapons.id, weaponId));
    }
  }
  return { ok: true, slug: unit.slug };
}

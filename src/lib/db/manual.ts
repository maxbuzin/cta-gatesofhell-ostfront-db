import "server-only";

import { neon } from "@neondatabase/serverless";
import { and, desc, eq } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";
import {
  factions,
  gameVersions,
  researchEdges,
  researchNodes,
  sources,
  unitCosts,
  unitStats,
  unitTypes,
  units,
} from "@/lib/db/schema";

type Db = NeonHttpDatabase<typeof schema>;

export type WriteResult =
  | { ok: true; slug: string }
  | { ok: false; status: number; error: string };

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

export async function createUnit(factionSlug: string, nameRaw: string): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const name = cleanName(nameRaw);
  const base = slugify(name);
  if (!name || !base) return { ok: false, status: 400, error: "Name is required" };
  const typeId = await ensureType(db);
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db.select({ id: units.id }).from(units).where(eq(units.slug, slug)).limit(1);
    if (!hit) break;
    slug = `${base.slice(0, 76)}-${n}`.replace(/-+$/g, "");
  }
  await db.insert(units).values({
    slug,
    name,
    searchName: fold(name) || slug,
    factionId: faction.id,
    unitTypeId: typeId,
  });
  return { ok: true, slug };
}

export async function createResearch(
  factionSlug: string,
  nameRaw: string,
  parentSlug: string | null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const faction = await factionBySlug(db, factionSlug);
  if (!faction) return { ok: false, status: 400, error: "Add a faction first" };
  const name = cleanName(nameRaw);
  const base = slugify(name);
  if (!name || !base) return { ok: false, status: 400, error: "Name is required" };
  const versionId = await ensureVersion(db);
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const [hit] = await db
      .select({ id: researchNodes.id })
      .from(researchNodes)
      .where(
        and(
          eq(researchNodes.factionId, faction.id),
          eq(researchNodes.gameVersionId, versionId),
          eq(researchNodes.slug, slug),
        ),
      )
      .limit(1);
    if (!hit) break;
    slug = `${base.slice(0, 76)}-${n}`.replace(/-+$/g, "");
  }
  let parentId: number | null = null;
  if (parentSlug) {
    const [parent] = await db
      .select({ id: researchNodes.id })
      .from(researchNodes)
      .where(
        and(
          eq(researchNodes.factionId, faction.id),
          eq(researchNodes.gameVersionId, versionId),
          eq(researchNodes.slug, parentSlug),
        ),
      )
      .limit(1);
    if (!parent) return { ok: false, status: 400, error: "Previous research was not found" };
    parentId = parent.id;
  }
  const [created] = await db
    .insert(researchNodes)
    .values({
      factionId: faction.id,
      gameVersionId: versionId,
      slug,
      name,
    })
    .returning({ id: researchNodes.id });
  if (parentId != null) {
    await db.insert(researchEdges).values({
      fromNodeId: parentId,
      toNodeId: created.id,
      kind: "requires",
    });
  }
  return { ok: true, slug };
}

async function unitRow(db: Db, slug: string) {
  const [row] = await db
    .select({ id: units.id, slug: units.slug, factionId: units.factionId })
    .from(units)
    .where(eq(units.slug, slug))
    .limit(1);
  return row ?? null;
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
    .select({ id: researchNodes.id, factionId: researchNodes.factionId, slug: researchNodes.slug })
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
  parentSlug: string | null,
): Promise<WriteResult> {
  const db = getWriteDb();
  if (!db) return { ok: false, status: 503, error: "Write connection is not configured" };
  const node = await researchRow(db, factionSlug, nodeSlug);
  if (!node) return { ok: false, status: 404, error: "Research not found" };
  let parentId: number | null = null;
  if (parentSlug) {
    const parent = await researchRow(db, factionSlug, parentSlug);
    if (!parent || parent.id === node.id) {
      return { ok: false, status: 400, error: "Previous research was not found" };
    }
    parentId = parent.id;
  }
  await db.delete(researchEdges).where(eq(researchEdges.toNodeId, node.id));
  if (parentId != null) {
    await db.insert(researchEdges).values({
      fromNodeId: parentId,
      toNodeId: node.id,
      kind: "requires",
    });
  }
  return { ok: true, slug: node.slug };
}

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/lib/db/schema.ts";
import {
  SNAPSHOT_FACTIONS,
  SNAPSHOT_TYPES,
  mapSnapshot,
} from "./snapshot-map.mjs";

const SNAPSHOT_PATH = path.join(process.cwd(), "data/snapshots/game-units.json");
const SOURCE_TITLE = "Gates of Hell game files";

function readPatch() {
  const flag = process.argv.indexOf("--patch");
  const fromArg = flag >= 0 ? process.argv[flag + 1] : "";
  const raw = String(fromArg || process.env.PATCH || "game").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(raw)) {
    console.error("PATCH or --patch required. Example: pnpm etl --patch game");
    process.exit(1);
  }
  return raw;
}

function etlUrl() {
  const raw = process.env.DATABASE_URL_ETL;
  if (!raw) {
    console.error("DATABASE_URL_ETL required");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    console.error("DATABASE_URL_ETL is not a valid URL");
    process.exit(1);
  }
  const user = decodeURIComponent(parsed.username || "");
  if (user !== "goh_etl") {
    console.error("DATABASE_URL_ETL user must be goh_etl");
    process.exit(1);
  }
  return raw;
}

function safeMessage(err) {
  const msg = err instanceof Error ? err.message : "Import failed";
  if (/postgres(ql)?:\/\//i.test(msg) || /DATABASE_URL/i.test(msg)) return "Import failed";
  return msg.slice(0, 500);
}

function loadSnapshot() {
  const doc = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  return mapSnapshot(doc);
}

function summarize(mapped) {
  const weaponSlugs = new Set();
  for (const record of mapped.records) {
    for (const weapon of record.weapons) weaponSlugs.add(weapon.slug);
  }
  return {
    units: mapped.records.length,
    skipped: mapped.skipped.length,
    weapons: weaponSlugs.size,
    research: mapped.research.length,
    skippedSample: mapped.skipped.slice(0, 15),
  };
}

async function ensureVersion(db, code) {
  await db
    .update(schema.gameVersions)
    .set({ isCurrent: false })
    .where(eq(schema.gameVersions.isCurrent, true));
  const [row] = await db
    .insert(schema.gameVersions)
    .values({ code, name: code, isCurrent: true })
    .onConflictDoUpdate({
      target: schema.gameVersions.code,
      set: { name: code, isCurrent: true },
    })
    .returning({ id: schema.gameVersions.id });
  return row.id;
}

async function ensureSource(db, patch) {
  const [existing] = await db
    .select({ id: schema.sources.id })
    .from(schema.sources)
    .where(
      and(eq(schema.sources.kind, "game_files_research"), eq(schema.sources.title, SOURCE_TITLE)),
    )
    .limit(1);
  if (existing) {
    await db
      .update(schema.sources)
      .set({ retrievedAt: new Date(), revision: patch })
      .where(eq(schema.sources.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(schema.sources)
    .values({
      kind: "game_files_research",
      title: SOURCE_TITLE,
      revision: patch,
      retrievedAt: new Date(),
    })
    .returning({ id: schema.sources.id });
  return row.id;
}

async function seedFactions(db) {
  const ids = new Map();
  for (const faction of SNAPSHOT_FACTIONS) {
    const [row] = await db
      .insert(schema.factions)
      .values(faction)
      .onConflictDoUpdate({
        target: schema.factions.slug,
        set: {
          nameEn: faction.nameEn,
          color: faction.color,
          sortOrder: faction.sortOrder,
        },
      })
      .returning({ id: schema.factions.id });
    ids.set(faction.slug, row.id);
  }
  return ids;
}

async function seedTypes(db) {
  const ids = new Map();
  for (const type of SNAPSHOT_TYPES) {
    const [row] = await db
      .insert(schema.unitTypes)
      .values(type)
      .onConflictDoUpdate({
        target: schema.unitTypes.code,
        set: { category: type.category, nameEn: type.nameEn },
      })
      .returning({ id: schema.unitTypes.id });
    ids.set(type.code, row.id);
  }
  return ids;
}

async function ensureWeapon(db, weapon, ctx) {
  const cached = ctx.weapons.get(weapon.slug);
  if (cached) return cached;
  const [row] = await db
    .insert(schema.weapons)
    .values({
      slug: weapon.slug,
      name: weapon.name,
      caliberMm: weapon.caliberMm,
      rateOfFireRpm: weapon.rateOfFireRpm,
      reloadS: weapon.reloadS,
      maxRangeM: weapon.maxRangeM,
    })
    .onConflictDoUpdate({
      target: schema.weapons.slug,
      set: {
        name: weapon.name,
        caliberMm: weapon.caliberMm,
        rateOfFireRpm: weapon.rateOfFireRpm,
        reloadS: weapon.reloadS,
        maxRangeM: weapon.maxRangeM,
      },
    })
    .returning({ id: schema.weapons.id });
  const ammoIds = new Map();
  for (const ammo of weapon.ammo) {
    const [ammoRow] = await db
      .insert(schema.ammoTypes)
      .values({
        slug: ammo.slug,
        name: ammo.name,
        kind: ammo.kind,
        caliberMm: ammo.caliberMm,
      })
      .onConflictDoUpdate({
        target: schema.ammoTypes.slug,
        set: { name: ammo.name, kind: ammo.kind, caliberMm: ammo.caliberMm },
      })
      .returning({ id: schema.ammoTypes.id });
    ammoIds.set(ammo.slug, ammoRow.id);
    await db
      .insert(schema.weaponAmmo)
      .values({
        weaponId: row.id,
        ammoTypeId: ammoRow.id,
        gameVersionId: ctx.versionId,
        isDefault: ammo.isDefault,
      })
      .onConflictDoUpdate({
        target: [
          schema.weaponAmmo.weaponId,
          schema.weaponAmmo.ammoTypeId,
          schema.weaponAmmo.gameVersionId,
        ],
        set: { isDefault: ammo.isDefault },
      });
    await db
      .delete(schema.penetrationByRange)
      .where(
        and(
          eq(schema.penetrationByRange.ammoTypeId, ammoRow.id),
          eq(schema.penetrationByRange.gameVersionId, ctx.versionId),
        ),
      );
    if (ammo.pen.length) {
      await db.insert(schema.penetrationByRange).values(
        ammo.pen.map((point) => ({
          ammoTypeId: ammoRow.id,
          gameVersionId: ctx.versionId,
          rangeM: point.rangeM,
          angleDeg: 0,
          penetrationMm: point.mm,
          sourceId: ctx.sourceId,
        })),
      );
    }
  }
  const saved = { id: row.id, ammoIds };
  ctx.weapons.set(weapon.slug, saved);
  return saved;
}

async function writeUnit(db, record, ctx) {
  const factionId = ctx.factionIds.get(record.factionSlug);
  const typeId = ctx.typeIds.get(record.typeCode);
  if (!factionId || !typeId) throw new Error(`Missing faction or type for ${record.slug}`);
  const [unit] = await db
    .insert(schema.units)
    .values({
      slug: record.slug,
      name: record.name,
      shortName: record.shortName,
      searchName: record.searchName,
      factionId,
      unitTypeId: typeId,
      crewSize: record.crewSize,
      squadSize: record.squadSize,
      tier: record.tier,
      notes: record.notes,
      confidence: "verified",
    })
    .onConflictDoUpdate({
      target: schema.units.slug,
      set: {
        name: record.name,
        shortName: record.shortName,
        searchName: record.searchName,
        factionId,
        unitTypeId: typeId,
        crewSize: record.crewSize,
        squadSize: record.squadSize,
        tier: record.tier,
        notes: record.notes,
        confidence: "verified",
        updatedAt: new Date(),
      },
    })
    .returning({ id: schema.units.id });

  await db
    .insert(schema.unitStats)
    .values({
      unitId: unit.id,
      gameVersionId: ctx.versionId,
      sourceId: ctx.sourceId,
      ...record.stats,
    })
    .onConflictDoUpdate({
      target: [schema.unitStats.unitId, schema.unitStats.gameVersionId],
      set: { sourceId: ctx.sourceId, ...record.stats },
    });

  await db
    .delete(schema.unitCosts)
    .where(
      and(
        eq(schema.unitCosts.unitId, unit.id),
        eq(schema.unitCosts.gameVersionId, ctx.versionId),
        eq(schema.unitCosts.gameMode, "conquest"),
      ),
    );
  if (record.costs.length) {
    await db.insert(schema.unitCosts).values(
      record.costs.map((cost) => ({
        unitId: unit.id,
        gameVersionId: ctx.versionId,
        gameMode: "conquest",
        kind: cost.kind,
        amount: cost.amount,
        sourceId: ctx.sourceId,
      })),
    );
  }

  await db.delete(schema.unitSpecialties).where(eq(schema.unitSpecialties.unitId, unit.id));
  await db
    .delete(schema.unitWeapons)
    .where(
      and(
        eq(schema.unitWeapons.unitId, unit.id),
        eq(schema.unitWeapons.gameVersionId, ctx.versionId),
      ),
    );
  for (const weapon of record.weapons) {
    const saved = await ensureWeapon(db, weapon, ctx);
    await db.insert(schema.unitWeapons).values({
      unitId: unit.id,
      weaponId: saved.id,
      gameVersionId: ctx.versionId,
      mount: weapon.mount,
      quantity: weapon.quantity,
    });
  }
  return unit.id;
}

async function writeResearch(db, mapped, ctx, unitIds) {
  await db
    .delete(schema.researchNodes)
    .where(eq(schema.researchNodes.gameVersionId, ctx.versionId));
  await db
    .delete(schema.researchSections)
    .where(eq(schema.researchSections.gameVersionId, ctx.versionId));
  const nodeIds = new Map();
  for (const node of mapped.research) {
    const factionId = ctx.factionIds.get(node.factionSlug);
    if (!factionId) continue;
    const [row] = await db
      .insert(schema.researchNodes)
      .values({
        factionId,
        gameVersionId: ctx.versionId,
        slug: node.slug,
        name: node.name,
        branch: node.branch,
        researchCost: node.researchCost,
        sourceId: ctx.sourceId,
      })
      .returning({ id: schema.researchNodes.id });
    nodeIds.set(`${node.factionSlug}|${node.slug}`, row.id);
  }
  for (const node of mapped.research) {
    const toId = nodeIds.get(`${node.factionSlug}|${node.slug}`);
    if (!toId) continue;
    for (const req of node.requires) {
      const fromId = nodeIds.get(`${node.factionSlug}|${req}`);
      if (!fromId || fromId === toId) continue;
      await db
        .insert(schema.researchEdges)
        .values({ fromNodeId: fromId, toNodeId: toId, kind: "requires" })
        .onConflictDoNothing();
    }
    for (const slug of node.unitSlugs) {
      const unitId = unitIds.get(slug);
      if (!unitId) continue;
      await db
        .insert(schema.researchNodeUnits)
        .values({ nodeId: toId, unitId })
        .onConflictDoNothing();
    }
  }
}

async function importMapped(db, mapped, patch) {
  const versionId = await ensureVersion(db, patch);
  const sourceId = await ensureSource(db, patch);
  const factionIds = await seedFactions(db);
  const typeIds = await seedTypes(db);
  const sha = process.env.GITHUB_SHA;
  const gitSha = /^[0-9a-f]{40}$/.test(sha || "") ? sha : null;
  const [run] = await db
    .insert(schema.importRuns)
    .values({
      startedAt: new Date(),
      gameVersionId: versionId,
      gitSha,
      status: "running",
      stats: {},
    })
    .returning({ id: schema.importRuns.id });

  const summary = summarize(mapped);
  try {
    const ctx = {
      versionId,
      sourceId,
      factionIds,
      typeIds,
      weapons: new Map(),
    };
    const unitIds = new Map();
    for (let i = 0; i < mapped.records.length; i++) {
      const id = await writeUnit(db, mapped.records[i], ctx);
      unitIds.set(mapped.records[i].slug, id);
      if (i > 0 && i % 500 === 0) console.error(`units ${i}`);
    }
    await writeResearch(db, mapped, ctx, unitIds);
    await db
      .update(schema.importRuns)
      .set({ finishedAt: new Date(), status: "ok", stats: summary })
      .where(eq(schema.importRuns.id, run.id));
    return summary;
  } catch (err) {
    await db
      .update(schema.importRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        stats: { message: safeMessage(err) },
      })
      .where(eq(schema.importRuns.id, run.id))
      .catch(() => {});
    throw err;
  }
}

async function main() {
  const patch = readPatch();
  const dryRun = process.argv.includes("--dry-run");
  const mapped = loadSnapshot();
  const summary = summarize(mapped);
  if (dryRun) {
    console.log(JSON.stringify({ patch, dryRun: true, ...summary }));
    return;
  }
  const db = drizzle(neon(etlUrl()), { schema });
  const written = await importMapped(db, mapped, patch);
  console.log(JSON.stringify({ patch, ...written }));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(safeMessage(err));
    process.exit(1);
  });
}

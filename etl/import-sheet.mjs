import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/lib/db/schema.ts";
import {
  FACTION_SEED,
  SHEET_EDIT_URL,
  SPREADSHEET_ID,
  TABS,
  mapSheet,
} from "./sheet-map.mjs";

function readPatch() {
  const flag = process.argv.indexOf("--patch");
  const fromArg = flag >= 0 ? process.argv[flag + 1] : "";
  const raw = String(fromArg || process.env.PATCH || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(raw)) {
    console.error("PATCH or --patch required. Example: pnpm etl --patch sheet");
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

async function fetchTabCsv(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(
      `Sheet gid ${gid} HTTP ${res.status}. Share the spreadsheet as anyone with the link can view.`,
    );
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 20_000_000) throw new Error(`Sheet gid ${gid} CSV is too large`);
  return new TextDecoder("utf-8").decode(buf);
}

function assertCsv(text, title) {
  const sample = text.slice(0, 300).trim().toLowerCase();
  if (
    !sample ||
    sample.startsWith("<!doctype") ||
    sample.startsWith("<html") ||
    sample.includes("<html")
  ) {
    throw new Error(
      `Tab ${title} did not return CSV. Share the spreadsheet as anyone with the link can view.`,
    );
  }
}

async function loadSheets() {
  const taken = new Set();
  const loaded = [];
  for (const tab of TABS) {
    const text = await fetchTabCsv(tab.gid);
    assertCsv(text, tab.title);
    const { records, skipped } = mapSheet(tab, text, taken);
    loaded.push({ tab, records, skipped });
  }
  return loaded;
}

function summarize(loaded) {
  return {
    units: loaded.reduce((n, tab) => n + tab.records.length, 0),
    skipped: loaded.reduce((n, tab) => n + tab.skipped.length, 0),
    tabs: loaded.map((tab) => ({
      title: tab.tab.title,
      units: tab.records.length,
      skipped: tab.skipped.length,
    })),
    skippedSample: loaded
      .flatMap((tab) => tab.skipped)
      .slice(0, 15)
      .map((row) => ({
        name: row.name ?? "",
        faction: row.faction ?? "",
        reason: row.skip,
      })),
  };
}

function likePrefix(slug) {
  const escaped = slug.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `${escaped}--%`;
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
      and(eq(schema.sources.kind, "google_sheet"), eq(schema.sources.url, SHEET_EDIT_URL)),
    )
    .limit(1);
  if (existing) {
    await db
      .update(schema.sources)
      .set({
        retrievedAt: new Date(),
        revision: patch,
        title: "CtA - gates of hell ostfront",
        license: "CC BY-SA 4.0",
      })
      .where(eq(schema.sources.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(schema.sources)
    .values({
      kind: "google_sheet",
      title: "CtA - gates of hell ostfront",
      url: SHEET_EDIT_URL,
      license: "CC BY-SA 4.0",
      revision: patch,
      retrievedAt: new Date(),
    })
    .returning({ id: schema.sources.id });
  return row.id;
}

async function seedFactions(db) {
  const ids = new Map();
  for (const faction of FACTION_SEED) {
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
  for (const tab of TABS) {
    const [row] = await db
      .insert(schema.unitTypes)
      .values({
        code: tab.code,
        category: tab.category,
        nameEn: tab.nameEn,
        sheetTab: tab.title,
      })
      .onConflictDoUpdate({
        target: schema.unitTypes.code,
        set: {
          category: tab.category,
          nameEn: tab.nameEn,
          sheetTab: tab.title,
        },
      })
      .returning({ id: schema.unitTypes.id });
    ids.set(tab.code, row.id);
  }
  return ids;
}

async function specialtyId(db, spec, cache) {
  const cached = cache.get(spec.slug);
  if (cached) return cached;
  const [row] = await db
    .insert(schema.specialties)
    .values({ slug: spec.slug, nameEn: spec.nameEn })
    .onConflictDoUpdate({
      target: schema.specialties.slug,
      set: { nameEn: spec.nameEn },
    })
    .returning({ id: schema.specialties.id });
  cache.set(spec.slug, row.id);
  return row.id;
}

async function clearWeapon(db, unitId, versionId, unitSlugValue) {
  await db
    .delete(schema.unitWeapons)
    .where(
      and(
        eq(schema.unitWeapons.unitId, unitId),
        eq(schema.unitWeapons.gameVersionId, versionId),
      ),
    );
  const ammoRows = await db
    .select({ id: schema.ammoTypes.id })
    .from(schema.ammoTypes)
    .where(sql`${schema.ammoTypes.slug} LIKE ${likePrefix(unitSlugValue)} ESCAPE '\\'`);
  const ammoIds = ammoRows.map((row) => row.id);
  if (ammoIds.length) {
    await db
      .delete(schema.penetrationByRange)
      .where(
        and(
          inArray(schema.penetrationByRange.ammoTypeId, ammoIds),
          eq(schema.penetrationByRange.gameVersionId, versionId),
        ),
      );
    await db
      .delete(schema.weaponAmmo)
      .where(
        and(
          inArray(schema.weaponAmmo.ammoTypeId, ammoIds),
          eq(schema.weaponAmmo.gameVersionId, versionId),
        ),
      );
  }
}

async function writeWeapon(db, unitId, versionId, sourceId, record) {
  await clearWeapon(db, unitId, versionId, record.slug);
  if (!record.weapon) return;
  const [weapon] = await db
    .insert(schema.weapons)
    .values({
      slug: record.weapon.slug,
      name: record.weapon.name,
      caliberMm: record.weapon.caliberMm,
      rateOfFireRpm: record.weapon.rateOfFireRpm,
      reloadS: record.weapon.reloadS,
      maxRangeM: record.weapon.maxRangeM,
    })
    .onConflictDoUpdate({
      target: schema.weapons.slug,
      set: {
        name: record.weapon.name,
        caliberMm: record.weapon.caliberMm,
        rateOfFireRpm: record.weapon.rateOfFireRpm,
        reloadS: record.weapon.reloadS,
        maxRangeM: record.weapon.maxRangeM,
      },
    })
    .returning({ id: schema.weapons.id });
  await db.insert(schema.unitWeapons).values({
    unitId,
    weaponId: weapon.id,
    gameVersionId: versionId,
    mount: "main",
    quantity: 1,
  });
  for (const ammo of record.ammo) {
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
    await db.insert(schema.weaponAmmo).values({
      weaponId: weapon.id,
      ammoTypeId: ammoRow.id,
      gameVersionId: versionId,
      isDefault: ammo.isDefault,
    });
    for (const pen of ammo.pen) {
      await db.insert(schema.penetrationByRange).values({
        ammoTypeId: ammoRow.id,
        gameVersionId: versionId,
        rangeM: pen.rangeM,
        angleDeg: 0,
        penetrationMm: pen.mm,
        sourceId,
      });
    }
  }
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
      confidence: "community",
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

  await db
    .delete(schema.unitSpecialties)
    .where(eq(schema.unitSpecialties.unitId, unit.id));
  const specIds = [];
  for (const spec of record.specialties) {
    const id = await specialtyId(db, spec, ctx.specialtyIds);
    if (!specIds.includes(id)) specIds.push(id);
  }
  if (specIds.length) {
    await db.insert(schema.unitSpecialties).values(
      specIds.map((id) => ({ unitId: unit.id, specialtyId: id })),
    );
  }

  await writeWeapon(db, unit.id, ctx.versionId, ctx.sourceId, record);
}

async function importLoaded(db, loaded, patch) {
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

  const summary = summarize(loaded);
  try {
    const ctx = {
      versionId,
      sourceId,
      factionIds,
      typeIds,
      specialtyIds: new Map(),
    };
    for (const tab of loaded) {
      for (const record of tab.records) await writeUnit(db, record, ctx);
    }
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
  const loaded = await loadSheets();
  const summary = summarize(loaded);
  if (dryRun) {
    console.log(JSON.stringify({ patch, dryRun: true, ...summary }));
    return;
  }
  const db = drizzle(neon(etlUrl()), { schema });
  const written = await importLoaded(db, loaded, patch);
  console.log(JSON.stringify({ patch, ...written }));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(safeMessage(err));
    process.exit(1);
  });
}

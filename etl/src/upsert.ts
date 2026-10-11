import { and, eq } from "drizzle-orm";
import type { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import {
  factions,
  gameVersions,
  sources,
  specialties,
  unitCosts,
  unitSpecialties,
  unitStats,
  unitTypes,
  unitWeapons,
  units,
  weapons,
  importRuns,
} from "../../src/lib/db/schema.ts";
import type { SheetMapping } from "./mapping.ts";
import { hasAnyStats } from "./parse.ts";
import { makeSlug } from "./slug.ts";
import type { UnitDraft } from "./types.ts";

export type UpsertStats = {
  added: number;
  changed: number;
  unchanged: number;
};

/**
 * Whole-run transaction. Idempotent: second run with same data → zero changes.
 */
export async function upsertAll(args: {
  pool: Pool;
  mapping: SheetMapping;
  patch: string;
  drafts: UnitDraft[];
}): Promise<UpsertStats> {
  const { pool, mapping, patch, drafts } = args;
  const client = await pool.connect();
  const db = drizzle(client);
  let added = 0;
  let changed = 0;
  let unchanged = 0;

  try {
    await client.query("BEGIN");

    // game version
    const existingGv = await db
      .select()
      .from(gameVersions)
      .where(eq(gameVersions.code, patch))
      .limit(1);
    let gameVersionId: number;
    if (existingGv[0]) {
      gameVersionId = existingGv[0].id;
      unchanged++;
    } else {
      // clear other current flags if this is current
      await db
        .update(gameVersions)
        .set({ isCurrent: false })
        .where(eq(gameVersions.isCurrent, true));
      const [ins] = await db
        .insert(gameVersions)
        .values({ code: patch, isCurrent: true, name: patch })
        .returning({ id: gameVersions.id });
      gameVersionId = ins!.id;
      added++;
    }

    // factions
    const factionIdBySlug = new Map<string, number>();
    for (const f of mapping.referenceData.factions) {
      const ex = await db
        .select()
        .from(factions)
        .where(eq(factions.slug, f.slug))
        .limit(1);
      if (ex[0]) {
        factionIdBySlug.set(f.slug, ex[0].id);
        unchanged++;
      } else {
        const [ins] = await db
          .insert(factions)
          .values({
            slug: f.slug,
            nameEn: f.nameEn,
            sortOrder: f.sortOrder,
            color:
              {
                germany: "#5E6B73",
                ussr: "#B23A2F",
                usa: "#4A6B3A",
                commonwealth: "#A8834A",
                finland: "#3E6FA8",
              }[f.slug] ?? "#7A8B5C",
          })
          .returning({ id: factions.id });
        factionIdBySlug.set(f.slug, ins!.id);
        added++;
      }
    }

    // unit types
    const typeIdByCode = new Map<string, number>();
    for (const t of mapping.referenceData.unitTypes) {
      const ex = await db
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.code, t.code))
        .limit(1);
      if (ex[0]) {
        typeIdByCode.set(t.code, ex[0].id);
        unchanged++;
      } else {
        const [ins] = await db
          .insert(unitTypes)
          .values({
            code: t.code,
            category: t.category as
              | "infantry"
              | "vehicle"
              | "gun"
              | "emplacement",
            nameEn: t.nameEn,
            sheetTab: t.sheetTab,
          })
          .returning({ id: unitTypes.id });
        typeIdByCode.set(t.code, ins!.id);
        added++;
      }
    }

    // sources
    const sourceIdByKey = new Map<string, number>();
    for (const s of mapping.referenceData.sources) {
      const ex = await db
        .select()
        .from(sources)
        .where(eq(sources.title, s.title))
        .limit(1);
      if (ex[0]) {
        sourceIdByKey.set(s.key, ex[0].id);
        unchanged++;
      } else {
        const [ins] = await db
          .insert(sources)
          .values({
            kind: s.kind as
              | "google_sheet"
              | "fandom_wiki"
              | "infantry_explorer"
              | "steam_guide"
              | "game_files_research"
              | "manual_override"
              | "community_pr",
            title: s.title,
            url: s.url,
            license: s.license,
            retrievedAt: new Date(),
          })
          .returning({ id: sources.id });
        sourceIdByKey.set(s.key, ins!.id);
        added++;
      }
    }

    // specialties
    const specialtyIdBySlug = new Map<string, number>();
    for (const s of mapping.referenceData.specialties) {
      const ex = await db
        .select()
        .from(specialties)
        .where(eq(specialties.slug, s.slug))
        .limit(1);
      if (ex[0]) {
        specialtyIdBySlug.set(s.slug, ex[0].id);
        unchanged++;
      } else {
        const [ins] = await db
          .insert(specialties)
          .values({ slug: s.slug, nameEn: s.nameEn })
          .returning({ id: specialties.id });
        specialtyIdBySlug.set(s.slug, ins!.id);
        added++;
      }
    }

    // weapons
    const weaponNames = [
      ...new Set(drafts.map((d) => d.weaponName).filter(Boolean) as string[]),
    ];
    const weaponIdBySlug = new Map<string, number>();
    for (const name of weaponNames) {
      const slug = makeSlug(name);
      const ex = await db
        .select()
        .from(weapons)
        .where(eq(weapons.slug, slug))
        .limit(1);
      if (ex[0]) {
        weaponIdBySlug.set(slug, ex[0].id);
        unchanged++;
      } else {
        const [ins] = await db
          .insert(weapons)
          .values({ slug, name })
          .returning({ id: weapons.id });
        weaponIdBySlug.set(slug, ins!.id);
        added++;
      }
    }

    // units + children
    for (const d of drafts) {
      if (!d.slug) throw new Error("slug missing before upsert");
      const factionId = factionIdBySlug.get(d.factionSlug);
      const unitTypeId = typeIdByCode.get(d.unitTypeCode);
      if (factionId == null || unitTypeId == null) {
        throw new Error(`Missing faction/type for ${d.slug}`);
      }
      const searchName = d.name.normalize("NFKD").toLowerCase();
      const ex = await db
        .select()
        .from(units)
        .where(eq(units.slug, d.slug))
        .limit(1);

      let unitId: number;
      if (ex[0]) {
        const same =
          ex[0].name === d.name &&
          ex[0].factionId === factionId &&
          ex[0].unitTypeId === unitTypeId &&
          ex[0].tier === d.tier &&
          ex[0].squadSize === d.squadSize &&
          ex[0].crewSize === d.crewSize &&
          (ex[0].notes ?? null) === (d.notes ?? null);
        if (same) unchanged++;
        else {
          await db
            .update(units)
            .set({
              name: d.name,
              searchName,
              factionId,
              unitTypeId,
              tier: d.tier,
              squadSize: d.squadSize,
              crewSize: d.crewSize,
              notes: d.notes,
              updatedAt: new Date(),
            })
            .where(eq(units.id, ex[0].id));
          changed++;
        }
        unitId = ex[0].id;
      } else {
        const [ins] = await db
          .insert(units)
          .values({
            slug: d.slug,
            name: d.name,
            searchName,
            factionId,
            unitTypeId,
            tier: d.tier,
            squadSize: d.squadSize,
            crewSize: d.crewSize,
            notes: d.notes,
            confidence: "community",
            firstVersionId: gameVersionId,
          })
          .returning({ id: units.id });
        unitId = ins!.id;
        added++;
      }

      // specialties
      for (const specName of d.specialties) {
        const spec = mapping.referenceData.specialties.find(
          (s) => s.nameEn === specName,
        );
        if (!spec) continue;
        const sid = specialtyIdBySlug.get(spec.slug);
        if (sid == null) continue;
        const link = await db
          .select()
          .from(unitSpecialties)
          .where(
            and(
              eq(unitSpecialties.unitId, unitId),
              eq(unitSpecialties.specialtyId, sid),
            ),
          )
          .limit(1);
        if (link[0]) unchanged++;
        else {
          await db
            .insert(unitSpecialties)
            .values({ unitId, specialtyId: sid })
            .onConflictDoNothing();
          added++;
        }
      }

      // stats
      if (hasAnyStats(d)) {
        const sourceId = sourceIdByKey.get(d.sourceKey) ?? sourceIdByKey.get("sheet")!;
        const st = await db
          .select()
          .from(unitStats)
          .where(
            and(
              eq(unitStats.unitId, unitId),
              eq(unitStats.gameVersionId, gameVersionId),
            ),
          )
          .limit(1);
        const values = {
          unitId,
          gameVersionId,
          sourceId,
          hp: numOrNull(d.stats.hp),
          armorFrontMm: numOrNull(d.stats.armor_front_mm),
          turretFrontMm: numOrNull(d.stats.turret_front_mm),
          speedRoadKmh: numOrNull(d.stats.speed_road_kmh),
          reloadS: numOrNull(d.stats.reload_s),
          visionRangeM: numOrNull(d.stats.vision_range_m),
          startingVeterancy: numOrNull(d.stats.starting_veterancy),
          fuelL: numOrNull(d.stats.fuel_l),
          penetrationMm: numOrNull(d.stats.penetration_mm),
          caliberMm: numOrNull(d.stats.caliber_mm),
          rangeM: numOrNull(d.stats.range_m),
          hpPerSoldier: numOrNull(d.stats.hp_per_soldier),
          rifles: numOrNull(d.stats.rifles),
          semiAuto: numOrNull(d.stats.semi_auto),
          smgs: numOrNull(d.stats.smgs),
          mgs: numOrNull(d.stats.mgs),
          atWeapons: numOrNull(d.stats.at_weapons),
          sniperRifles: numOrNull(d.stats.sniper_rifles),
          extra: d.extra,
        };
        if (st[0]) {
          await db
            .update(unitStats)
            .set(values)
            .where(eq(unitStats.id, st[0].id));
          changed++;
        } else {
          await db.insert(unitStats).values(values);
          added++;
        }
      }

      // costs (multiplayer mode per locked rules)
      for (const c of d.costs) {
        const exCost = await db
          .select()
          .from(unitCosts)
          .where(
            and(
              eq(unitCosts.unitId, unitId),
              eq(unitCosts.gameVersionId, gameVersionId),
              eq(unitCosts.gameMode, "multiplayer"),
              eq(unitCosts.kind, c.kind),
            ),
          )
          .limit(1);
        if (exCost[0]) {
          if (exCost[0].amount === c.amount) unchanged++;
          else {
            await db
              .update(unitCosts)
              .set({ amount: c.amount })
              .where(eq(unitCosts.id, exCost[0].id));
            changed++;
          }
        } else {
          await db.insert(unitCosts).values({
            unitId,
            gameVersionId,
            gameMode: "multiplayer",
            kind: c.kind,
            amount: c.amount,
            sourceId: sourceIdByKey.get(d.sourceKey),
          });
          added++;
        }
      }

      // unit_weapons
      if (d.weaponName) {
        const wslug = makeSlug(d.weaponName);
        const wid = weaponIdBySlug.get(wslug);
        if (wid != null) {
          const uw = await db
            .select()
            .from(unitWeapons)
            .where(
              and(
                eq(unitWeapons.unitId, unitId),
                eq(unitWeapons.weaponId, wid),
                eq(unitWeapons.gameVersionId, gameVersionId),
              ),
            )
            .limit(1);
          if (uw[0]) unchanged++;
          else {
            await db.insert(unitWeapons).values({
              unitId,
              weaponId: wid,
              gameVersionId,
              mount: "main",
              quantity: 1,
            });
            added++;
          }
        }
      }
    }

    await db.insert(importRuns).values({
      startedAt: new Date(),
      finishedAt: new Date(),
      gameVersionId,
      status: "ok",
      stats: {
        units: drafts.length,
        added,
        changed,
        unchanged,
      },
    });

    await client.query("COMMIT");
    return { added, changed, unchanged };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

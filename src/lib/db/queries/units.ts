import "server-only";

import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db/client";
import { popularComparisons } from "@/lib/db/schema";
import {
  snapshotCounts,
  snapshotFaction,
  snapshotFactionCounts,
  snapshotFactions,
  snapshotList,
  snapshotResearch,
  snapshotSearch,
  snapshotSourceList,
  snapshotSpecialties,
  snapshotUnit,
  snapshotUnitsBySlugs,
  snapshotVersion,
  snapshotVersions,
} from "@/lib/snapshot-fallback";

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

export type SortKey =
  | "name_asc"
  | "name_desc"
  | "hp_asc"
  | "hp_desc"
  | "armor_asc"
  | "armor_desc"
  | "speed_asc"
  | "speed_desc"
  | "pen_asc"
  | "pen_desc";

export async function getUnitCountsByType(): Promise<
  { code: string; nameEn: string; count: number }[]
> {
  "use cache";
  cacheLife("max");
  cacheTag("units", "home");
  return snapshotCounts();
}

export async function getFactions() {
  "use cache";
  cacheLife("max");
  cacheTag("factions");
  return snapshotFactions();
}

export async function getFactionBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("factions", `faction:${slug}`);
  return snapshotFaction(slug);
}

export async function getSpecialties() {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  return snapshotSpecialties();
}

export async function getCurrentGameVersion() {
  "use cache";
  cacheLife("max");
  cacheTag("patches");
  return snapshotVersion();
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
  return snapshotSourceList();
}

export async function getGameVersions() {
  "use cache";
  cacheLife("max");
  cacheTag("patches");
  return snapshotVersions();
}

export async function listUnits(filters: UnitListFilters) {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  return snapshotList(filters);
}

export async function getUnitBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("units", `unit:${slug}`);
  return snapshotUnit(slug);
}

export async function getUnitsBySlugs(slugs: string[]) {
  "use cache";
  cacheLife("max");
  cacheTag("units");
  const unique = [
    ...new Set(slugs.filter((s) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(s))),
  ].slice(0, 4);
  if (unique.length === 0) return [];
  return snapshotUnitsBySlugs(unique);
}

export async function getSearchIndex() {
  "use cache";
  cacheLife("max");
  cacheTag("units", "home");
  return snapshotSearch();
}

export async function getResearchTree(factionSlug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("research", `research:${factionSlug}`);
  return snapshotResearch(factionSlug);
}

export async function getFactionUnitCounts(factionId: number) {
  "use cache";
  cacheLife("max");
  cacheTag("factions");
  return snapshotFactionCounts(factionId);
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { TabName } from "./types.ts";

export type SheetMapping = {
  version: number;
  spreadsheet: { id: string; title: string; skipTabs: string[] };
  referenceData: {
    factions: { sheet: string; slug: string; nameEn: string; sortOrder: number }[];
    unitTypes: {
      code: string;
      category: string;
      nameEn: string;
      sheetTab: string;
    }[];
    sources: {
      key: string;
      kind: string;
      title: string;
      sheetValue: string | null;
      license: string | null;
      url: string | null;
    }[];
    specialtyCompounds: string[];
    specialties: { nameEn: string; slug: string }[];
    ammoKindMap: Record<string, string>;
  };
  defaults: Record<string, string>;
  rules: Record<string, unknown>;
  unitTypeRules: Record<string, unknown>;
  tabs: Record<
    string,
    {
      csv: string;
      unitType: { rule?: string; default?: string; single?: string };
      columns: Record<
        string,
        {
          target: string;
          type: string;
          required?: boolean;
          min?: number;
          max?: number;
          keepExactIn?: string;
          whenSource?: Record<string, string>;
          alsoTarget?: string;
          discriminator?: boolean;
        }
      >;
    }
  >;
};

export function loadMapping(root: string): SheetMapping {
  return JSON.parse(
    readFileSync(join(root, "etl/sheet-mapping.json"), "utf8"),
  ) as SheetMapping;
}

export function tabNames(mapping: SheetMapping): TabName[] {
  return Object.keys(mapping.tabs) as TabName[];
}

export function factionSlug(
  mapping: SheetMapping,
  sheetFaction: string,
): string | null {
  const hit = mapping.referenceData.factions.find(
    (f) => f.sheet.toLowerCase() === sheetFaction.toLowerCase(),
  );
  return hit?.slug ?? null;
}

export function sourceKey(
  mapping: SheetMapping,
  sheetValue: string | null | undefined,
): string {
  if (!sheetValue) return "sheet";
  const hit = mapping.referenceData.sources.find(
    (s) => s.sheetValue && s.sheetValue === sheetValue,
  );
  return hit?.key ?? "sheet";
}

/** Backend dry-run expected counts (sheet-dry-run.md). */
export const EXPECTED_DRY_RUN = {
  read: 1089,
  units: 1084,
  withStats: 1013,
  weapons: 211,
  factions: 5,
  merged: 4,
  rejected: 1,
  costs: 93,
  specialties: 16,
  unitSpecialties: 2569,
} as const;

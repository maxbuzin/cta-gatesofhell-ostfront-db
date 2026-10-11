import type { SheetMapping } from "./mapping.ts";
import { factionSlug, sourceKey } from "./mapping.ts";
import {
  mapAmmoTokens,
  normalizeUnitName,
  normalizeWeaponName,
  parseNumber,
  parseYesNo,
  roundSmallint,
  splitSpecialties,
} from "./normalize.ts";
import { resolveUnitType } from "./unit-type.ts";
import { fingerprintCells, sanitizePlainText } from "./text.ts";
import type { Issue, ParsedCost, RawRow, TabName, UnitDraft } from "./types.ts";

function setPath(
  draft: UnitDraft,
  target: string,
  value: number | string | null,
): void {
  if (value == null || value === "") return;
  if (target.startsWith("unit_stats.extra.")) {
    const key = target.slice("unit_stats.extra.".length);
    draft.extra[key] = value;
    return;
  }
  if (target.startsWith("unit_stats.")) {
    const key = target.slice("unit_stats.".length);
    draft.stats[key] = value;
    return;
  }
  if (target === "units.tier" && typeof value === "number") {
    draft.tier = value;
    return;
  }
  if (target === "units.squad_size" && typeof value === "number") {
    draft.squadSize = value;
    return;
  }
  if (target === "units.crew_size" && typeof value === "number") {
    draft.crewSize = value;
    return;
  }
  if (target === "units.notes" && typeof value === "string") {
    draft.notes = value;
  }
}

export function parseRows(
  mapping: SheetMapping,
  rows: RawRow[],
  root: string,
): { drafts: UnitDraft[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const drafts: UnitDraft[] = [];
  const compounds = mapping.referenceData.specialtyCompounds;

  for (const row of rows) {
    const tabConfig = mapping.tabs[row.tab];
    if (!tabConfig) continue;
    const cells = row.cells;
    const nameRaw = cells["Unit"] ?? "";
    if (!nameRaw.trim()) {
      issues.push({
        level: "error",
        code: "blank_name",
        tab: row.tab,
        row: row.rowNumber,
        message: "Blank unit name — rejected",
      });
      continue;
    }

    const { name, ieId } = normalizeUnitName(nameRaw, root);
    if (ieId) {
      issues.push({
        level: "info",
        code: "id_in_name",
        tab: row.tab,
        row: row.rowNumber,
        message: `Stripped embedded id ${ieId}`,
      });
    }

    const factionRaw = sanitizePlainText(cells["Faction"] ?? "", 80);
    const fSlug = factionSlug(mapping, factionRaw);
    if (!fSlug) {
      issues.push({
        level: "error",
        code: "unknown_faction",
        tab: row.tab,
        row: row.rowNumber,
        message: `Unknown faction "${factionRaw}" — rejected`,
      });
      continue;
    }

    const srcRaw = cells["Source"] ?? "";
    const sKey = sourceKey(mapping, srcRaw || null);
    const specialties = splitSpecialties(
      cells["Main Specialty"] ?? "",
      compounds,
    );
    const typeCol = cells["Type"] ?? null;
    const squadParsed = parseNumber(cells["Squad size"] ?? "");

    const draft: UnitDraft = {
      tab: row.tab as TabName,
      rowNumber: row.rowNumber,
      identityKey: `${row.tab}\t${fSlug}\t${name.toLowerCase()}`,
      name,
      factionSlug: fSlug,
      unitTypeCode: "tank",
      notes: null,
      tier: null,
      squadSize: squadParsed,
      crewSize: null,
      specialties,
      sourceKey: sKey,
      costs: [],
      weaponName: null,
      stats: {},
      extra: {},
      discriminator: null,
      rawFingerprint: fingerprintCells(cells),
    };
    if (ieId) draft.extra.ie_id = ieId;

    const notesText = Object.entries(cells).find(([h]) =>
      h.toLowerCase().startsWith("notes"),
    )?.[1];
    const skipCosts =
      typeof notesText === "string" &&
      /unit not specified/i.test(notesText);

    for (const [header, col] of Object.entries(tabConfig.columns)) {
      const raw = cells[header] ?? "";
      if (!raw && !col.required) continue;

      if (col.type === "text") {
        if (col.target === "units.name") continue;
        const text = sanitizePlainText(raw, 4000);
        if (col.discriminator) {
          // handled below for era/doctrine
        }
        setPath(draft, col.target, text || null);
        continue;
      }

      if (col.type === "faction" || col.type === "source" || col.type === "specialty_list") {
        continue;
      }

      if (col.type === "weapon") {
        if (!raw.trim()) continue;
        draft.weaponName = normalizeWeaponName(raw, root);
        continue;
      }

      if (col.type === "ammo_list") {
        const { kinds, unknown } = mapAmmoTokens(
          raw,
          mapping.referenceData.ammoKindMap,
        );
        if (kinds.length) draft.extra.ammo_types = kinds.join(",");
        for (const u of unknown) {
          issues.push({
            level: "warning",
            code: "unknown_ammo_token",
            tab: row.tab,
            row: row.rowNumber,
            message: `Unknown ammo token "${u}" → Other`,
          });
        }
        continue;
      }

      if (col.type === "yes_no") {
        const yn = parseYesNo(raw);
        if (yn != null) setPath(draft, col.target, yn);
        continue;
      }

      if (col.target.startsWith("unit_costs:")) {
        if (skipCosts) {
          issues.push({
            level: "warning",
            code: "cost_skipped_unspecified",
            tab: row.tab,
            row: row.rowNumber,
            message: "Cost skipped (notes: unit not specified)",
          });
          continue;
        }
        const n = parseNumber(raw);
        if (n == null) continue;
        if (n < 0 || (col.min != null && n < col.min)) {
          issues.push({
            level: "warning",
            code: "negative",
            tab: row.tab,
            row: row.rowNumber,
            message: `${header}: ${raw} → null`,
          });
          continue;
        }
        if (col.max != null && n > col.max) {
          issues.push({
            level: "warning",
            code: "out_of_range",
            tab: row.tab,
            row: row.rowNumber,
            message: `${header}: ${n} outside max ${col.max}`,
          });
        }
        const kind = col.target.endsWith(":cp") ? "cp" : "resources";
        draft.costs.push({ kind, amount: Math.trunc(n) } satisfies ParsedCost);
        continue;
      }

      const n = parseNumber(raw);
      if (n == null) {
        if (raw.trim()) {
          issues.push({
            level: "warning",
            code: "non_numeric",
            tab: row.tab,
            row: row.rowNumber,
            message: `${header}: non-numeric "${raw}" → null`,
          });
        }
        continue;
      }

      let target = col.target;
      if (col.whenSource && col.whenSource[sKey]) {
        target = col.whenSource[sKey]!;
      }

      if (col.type === "smallint_round") {
        if (!Number.isInteger(n)) {
          issues.push({
            level: "info",
            code: "decimal_in_smallint",
            tab: row.tab,
            row: row.rowNumber,
            message: `${header}: ${n} rounded; exact kept in extra`,
          });
        }
        const rounded = roundSmallint(n);
        setPath(draft, target, rounded);
        if (col.keepExactIn) setPath(draft, col.keepExactIn, n);
        if (col.alsoTarget) setPath(draft, col.alsoTarget, n);
        continue;
      }

      if (
        col.type.startsWith("numeric") ||
        col.type === "int" ||
        col.type === "smallint"
      ) {
        if (col.min != null && n < col.min) {
          issues.push({
            level: "warning",
            code: "below_min",
            tab: row.tab,
            row: row.rowNumber,
            message: `${header}: ${n} < ${col.min} → null`,
          });
          continue;
        }
        const store =
          col.type === "int" || col.type === "smallint"
            ? Math.trunc(n)
            : n;
        setPath(draft, target, store);
        if (col.alsoTarget) setPath(draft, col.alsoTarget, store);
      }
    }

    // Discriminators for infantry
    const era = sanitizePlainText(cells["Era"] ?? "", 120);
    const doctrine = sanitizePlainText(cells["Doctrine / section"] ?? "", 120);
    if (era) draft.extra.era = era;
    if (doctrine) draft.extra.doctrine = doctrine;

    if (row.tab === "Infantry") {
      const bits = [era, doctrine === "Conquest research tree" ? "conquest" : doctrine]
        .filter(Boolean)
        .join(" ");
      draft.discriminator = bits || sKey;
    } else if (draft.weaponName) {
      draft.discriminator = draft.weaponName;
    }

    draft.unitTypeCode = resolveUnitType({
      tab: row.tab,
      name: draft.name,
      specialties: draft.specialties,
      squadSize: draft.squadSize,
      ieId,
      typeColumn: typeCol,
    });

    // Weapon count > squad size warning
    if (draft.squadSize != null) {
      const wSum = ["rifles", "semi_auto", "smgs", "mgs", "at_weapons", "sniper_rifles"]
        .map((k) => Number(draft.stats[k] ?? 0))
        .reduce((a, b) => a + b, 0);
      if (wSum > draft.squadSize) {
        issues.push({
          level: "warning",
          code: "weapons_gt_squad",
          tab: row.tab,
          row: row.rowNumber,
          message: `${wSum}>${draft.squadSize}`,
        });
      }
    }

    drafts.push(draft);
  }

  return { drafts, issues };
}

export function hasAnyStats(u: UnitDraft): boolean {
  return (
    Object.values(u.stats).some((v) => v != null && v !== "") ||
    Object.keys(u.extra).some(
      (k) =>
        ![
          "era",
          "doctrine",
          "ie_id",
          "ammo_types",
          "main_weapons",
          "tank_class",
        ].includes(k) && u.extra[k] != null,
    )
  );
}

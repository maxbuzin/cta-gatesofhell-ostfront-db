import type { Issue, MergeResult, UnitDraft } from "./types.ts";

function significantFields(u: UnitDraft): string {
  return JSON.stringify({
    name: u.name,
    factionSlug: u.factionSlug,
    unitTypeCode: u.unitTypeCode,
    notes: u.notes,
    tier: u.tier,
    squadSize: u.squadSize,
    crewSize: u.crewSize,
    specialties: u.specialties,
    sourceKey: u.sourceKey,
    costs: u.costs,
    stats: u.stats,
    extra: Object.fromEntries(
      Object.entries(u.extra).filter(
        ([k]) => !["era", "doctrine", "ie_id"].includes(k),
      ),
    ),
  });
}

function onlyWeaponDiffers(a: UnitDraft, b: UnitDraft): boolean {
  return (
    a.weaponName !== b.weaponName &&
    significantFields(a) === significantFields(b)
  );
}

/**
 * Merge exact duplicates; keep weapon variants; reject conflicting duplicates.
 * Infantry same-name rows stay separate unless the entire raw fingerprint matches.
 */
export function mergeDrafts(drafts: UnitDraft[]): MergeResult {
  const issues: Issue[] = [];
  const merged: MergeResult["merged"] = [];
  const rejected: MergeResult["rejected"] = [];
  const out: UnitDraft[] = [];

  const groups = new Map<string, UnitDraft[]>();
  for (const d of drafts) {
    const list = groups.get(d.identityKey) ?? [];
    list.push(d);
    groups.set(d.identityKey, list);
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }

    const kept: UnitDraft[] = [];
    for (const g of group) {
      const exact = kept.find((k) => k.rawFingerprint === g.rawFingerprint);
      if (exact) {
        merged.push({
          kept: `${exact.tab}!${exact.rowNumber}`,
          dropped: `${g.tab}!${g.rowNumber}`,
        });
        continue;
      }

      if (g.tab === "Infantry") {
        // Distinct infantry sources/eras are separate units
        kept.push(g);
        continue;
      }

      const weaponVar = kept.find((k) => onlyWeaponDiffers(k, g));
      if (weaponVar) {
        kept.push(g);
        continue;
      }

      const conflict = kept.find(
        (k) => significantFields(k) !== significantFields(g),
      );
      if (conflict) {
        rejected.push({
          tab: g.tab,
          row: g.rowNumber,
          reason: `Conflicting duplicate of ${conflict.tab}!${conflict.rowNumber}`,
        });
        issues.push({
          level: "error",
          code: "conflict",
          tab: g.tab,
          row: g.rowNumber,
          message: `Rejected conflicting duplicate of row ${conflict.rowNumber}`,
        });
        continue;
      }

      kept.push(g);
    }
    out.push(...kept);
  }

  return { units: out, merged, rejected, issues };
}

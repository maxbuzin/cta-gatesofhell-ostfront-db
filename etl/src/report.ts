import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { EXPECTED_DRY_RUN } from "./mapping.ts";
import { hasAnyStats } from "./parse.ts";
import type { DryRunReport, EtlCounts, MergeResult, UnitDraft } from "./types.ts";

export function computeCounts(
  read: number,
  merge: MergeResult,
  drafts: UnitDraft[],
): EtlCounts {
  const weaponSlugs = new Set(
    drafts.map((d) => d.weaponName).filter(Boolean) as string[],
  );
  const factionSlugs = new Set(drafts.map((d) => d.factionSlug));
  const specialtyNames = new Set(drafts.flatMap((d) => d.specialties));
  let unitSpecialties = 0;
  for (const d of drafts) unitSpecialties += d.specialties.length;
  let costs = 0;
  for (const d of drafts) costs += d.costs.length;

  return {
    read,
    units: drafts.length,
    withStats: drafts.filter(hasAnyStats).length,
    weapons: weaponSlugs.size,
    factions: factionSlugs.size,
    merged: merge.merged.length,
    rejected: merge.rejected.length,
    costs,
    specialties: specialtyNames.size,
    unitSpecialties,
  };
}

export function buildReport(args: {
  patch: string;
  dryRun: boolean;
  read: number;
  merge: MergeResult;
  drafts: UnitDraft[];
  compareExpected: boolean;
}): DryRunReport {
  const counts = computeCounts(args.read, args.merge, args.drafts);
  let matchesExpected: boolean | null = null;
  if (args.compareExpected) {
    matchesExpected =
      counts.units === EXPECTED_DRY_RUN.units &&
      counts.withStats === EXPECTED_DRY_RUN.withStats &&
      counts.weapons === EXPECTED_DRY_RUN.weapons &&
      counts.factions === EXPECTED_DRY_RUN.factions &&
      counts.merged === EXPECTED_DRY_RUN.merged &&
      counts.rejected === EXPECTED_DRY_RUN.rejected;
  }
  return {
    patch: args.patch,
    dryRun: args.dryRun,
    counts,
    expected: args.compareExpected ? { ...EXPECTED_DRY_RUN } : undefined,
    matchesExpected,
    rejected: args.merge.rejected,
    merged: args.merge.merged,
    issues: args.merge.issues,
  };
}

export function writeReportMarkdown(
  root: string,
  report: DryRunReport,
  writeStats?: { added: number; changed: number; unchanged: number },
): string {
  const dir = join(root, "data/reports");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `etl-${report.patch}.md`);
  const lines = [
    `# ETL report — ${report.patch}`,
    "",
    `Mode: **${report.dryRun ? "dry-run" : "write"}**`,
    "",
    "## Counts",
    "",
    `| Metric | Value |`,
    `|---|---|`,
    `| Rows read | ${report.counts.read} |`,
    `| Units | ${report.counts.units} |`,
    `| Units with stats | ${report.counts.withStats} |`,
    `| Weapons | ${report.counts.weapons} |`,
    `| Factions | ${report.counts.factions} |`,
    `| Merged duplicates | ${report.counts.merged} |`,
    `| Rejected | ${report.counts.rejected} |`,
    `| Cost rows | ${report.counts.costs} |`,
    `| Specialties | ${report.counts.specialties} |`,
    `| Unit–specialty links | ${report.counts.unitSpecialties} |`,
    "",
  ];
  if (writeStats) {
    lines.push(
      "## Write stats",
      "",
      `- Added: ${writeStats.added}`,
      `- Changed: ${writeStats.changed}`,
      `- Unchanged: ${writeStats.unchanged}`,
      "",
    );
  }
  if (report.expected) {
    lines.push(
      "## Expected (Backend dry-run)",
      "",
      `- Target units: ${report.expected.units}`,
      `- Match: ${report.matchesExpected ? "YES" : "NO"}`,
      "",
    );
  }
  if (report.rejected.length) {
    lines.push("## Rejected", "");
    for (const r of report.rejected) {
      lines.push(`- ${r.tab}!${r.row}: ${r.reason}`);
    }
    lines.push("");
  }
  if (report.merged.length) {
    lines.push("## Merged", "");
    for (const m of report.merged) {
      lines.push(`- ${m.dropped} → ${m.kept}`);
    }
    lines.push("");
  }
  const warnings = report.issues.filter((i) => i.level !== "info");
  if (warnings.length) {
    lines.push(`## Issues (${warnings.length})`, "");
    for (const i of warnings.slice(0, 200)) {
      lines.push(
        `- \`${i.code}\` ${i.tab}${i.row != null ? `!${i.row}` : ""}: ${i.message}`,
      );
    }
    if (warnings.length > 200) lines.push(`- …and ${warnings.length - 200} more`);
    lines.push("");
  }
  writeFileSync(path, lines.join("\n"), "utf8");
  return path;
}

export function printSummary(
  report: DryRunReport,
  writeStats?: { added: number; changed: number; unchanged: number },
): void {
  const c = report.counts;
  console.log(
    [
      `ETL ${report.dryRun ? "dry-run" : "write"} patch=${report.patch}`,
      `read=${c.read} units=${c.units} stats=${c.withStats} weapons=${c.weapons} factions=${c.factions}`,
      `merged=${c.merged} rejected=${c.rejected} costs=${c.costs}`,
      writeStats
        ? `added=${writeStats.added} changed=${writeStats.changed} unchanged=${writeStats.unchanged}`
        : null,
      report.matchesExpected == null
        ? null
        : `matchesExpected=${report.matchesExpected}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

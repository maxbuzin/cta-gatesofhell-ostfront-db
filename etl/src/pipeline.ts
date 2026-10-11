import { join } from "node:path";

import { createEtlDb } from "./db.ts";
import {
  fetchCsvExport,
  fetchWithServiceAccount,
  loadLocalCsvs,
} from "./fetch.ts";
import { loadMapping, EXPECTED_DRY_RUN } from "./mapping.ts";
import { mergeDrafts } from "./merge.ts";
import { applyOverrides, loadOverrides } from "./overrides.ts";
import { parseRows } from "./parse.ts";
import { buildReport, printSummary, writeReportMarkdown } from "./report.ts";
import { maybeRevalidate } from "./revalidate.ts";
import { assignSlugs } from "./slug.ts";
import { upsertAll } from "./upsert.ts";
import { validateDrafts } from "./validate.ts";
import type { DryRunReport, RawRow, UnitDraft } from "./types.ts";

export type RunOptions = {
  root: string;
  patch: string;
  dryRun: boolean;
  fromDir?: string;
  compareExpected?: boolean;
};

export async function loadRows(opts: RunOptions): Promise<RawRow[]> {
  const mapping = loadMapping(opts.root);
  if (opts.fromDir) {
    return loadLocalCsvs(mapping, opts.fromDir);
  }
  const sa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const cacheDir = join(opts.root, "data/raw", opts.patch);
  if (sa) {
    return fetchWithServiceAccount(mapping, sa, cacheDir);
  }
  return fetchCsvExport(mapping, cacheDir);
}

/** Pure transform path used by CLI and tests (no DB). */
export function transformRows(opts: {
  root: string;
  patch: string;
  rows: RawRow[];
  dryRun: boolean;
  compareExpected?: boolean;
  persistSlugs?: boolean;
}): { report: DryRunReport; drafts: UnitDraft[] } {
  const mapping = loadMapping(opts.root);
  const { drafts: parsed, issues } = parseRows(mapping, opts.rows, opts.root);
  const validated = validateDrafts(parsed);
  const overrides = loadOverrides(opts.root);
  const overridden = applyOverrides(validated.drafts, overrides);
  const merged = mergeDrafts(overridden);
  merged.issues.push(...issues, ...validated.issues);
  const drafts = assignSlugs(
    merged.units,
    opts.root,
    Boolean(opts.persistSlugs && !opts.dryRun),
  );
  // Re-validate after slug assignment (slug regex)
  const afterSlug = validateDrafts(drafts);
  merged.issues.push(...afterSlug.issues);
  const finalDrafts = afterSlug.drafts;
  const report = buildReport({
    patch: opts.patch,
    dryRun: opts.dryRun,
    read: opts.rows.length,
    merge: { ...merged, units: finalDrafts },
    drafts: finalDrafts,
    compareExpected: Boolean(opts.compareExpected),
  });
  return { report, drafts: finalDrafts };
}

export async function runEtl(opts: RunOptions): Promise<DryRunReport> {
  const rows = await loadRows(opts);
  const { report, drafts } = transformRows({
    root: opts.root,
    patch: opts.patch,
    rows,
    dryRun: opts.dryRun,
    compareExpected: opts.compareExpected ?? Boolean(opts.fromDir),
    persistSlugs: !opts.dryRun,
  });

  let writeStats:
    | { added: number; changed: number; unchanged: number }
    | undefined;
  if (!opts.dryRun) {
    const url = process.env.DATABASE_URL_ETL;
    if (!url) {
      throw new Error("DATABASE_URL_ETL is required for write runs");
    }
    const { pool } = createEtlDb(url);
    try {
      writeStats = await upsertAll({
        pool,
        mapping: loadMapping(opts.root),
        patch: opts.patch,
        drafts,
      });
      await maybeRevalidate();
    } finally {
      await pool.end();
    }
  }

  const path = writeReportMarkdown(opts.root, report, writeStats);
  printSummary(report, writeStats);
  console.log(`Report: ${path}`);
  if (report.matchesExpected === false) {
    console.warn(
      `Counts differ from Backend dry-run expectation (${EXPECTED_DRY_RUN.units} units).`,
    );
  }
  return report;
}

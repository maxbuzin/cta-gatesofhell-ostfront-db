#!/usr/bin/env node
import { resolve } from "node:path";

import { runEtl } from "./pipeline.ts";

function usage(): never {
  console.log(`Usage:
  pnpm etl --dry-run [--patch <code>] [--from data/raw/<dir>]
  pnpm etl [--patch <code>] [--from data/raw/<dir>]

Options:
  --dry-run     Parse/normalize/merge only; no DB writes; write data/reports/etl-<patch>.md
  --patch       Game version code (default: current)
  --from        Directory of local CSV exports (mapping filenames)
  --expect      Compare counts to Backend dry-run expectation (1084 units)

Env:
  DATABASE_URL_ETL              required for write runs (user goh_etl only)
  GOOGLE_SERVICE_ACCOUNT_JSON   optional read-only Sheets access
  SITE_URL / REVALIDATE_SECRET  optional post-write cache bust
`);
  process.exit(2);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) usage();

  let dryRun = false;
  let patch = "current";
  let fromDir: string | undefined;
  let compareExpected = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--dry-run") dryRun = true;
    else if (a === "--expect") compareExpected = true;
    else if (a === "--patch") {
      patch = args[++i] || usage();
    } else if (a.startsWith("--patch=")) {
      patch = a.slice("--patch=".length);
    } else if (a === "--from") {
      fromDir = args[++i] || usage();
    } else if (a.startsWith("--from=")) {
      fromDir = a.slice("--from=".length);
    } else if (a === "etl") {
      // ignore pnpm script passthrough
    } else {
      console.error(`Unknown argument: ${a}`);
      usage();
    }
  }

  const root = resolve(process.cwd());
  if (fromDir) fromDir = resolve(root, fromDir);

  await runEtl({
    root,
    patch,
    dryRun,
    fromDir,
    compareExpected,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

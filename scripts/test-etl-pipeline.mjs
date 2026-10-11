import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import { EXPECTED_DRY_RUN } from "../etl/src/mapping.ts";
import { loadLocalCsvs } from "../etl/src/fetch.ts";
import { loadMapping } from "../etl/src/mapping.ts";
import { transformRows } from "../etl/src/pipeline.ts";
import { assertEtlDatabaseUrl } from "../etl/src/db.ts";
import { makeSlug } from "../etl/src/slug.ts";
import { normalizeUnitName, normalizeWeaponName } from "../etl/src/normalize.ts";

const root = resolve(".");

describe("Backend dry-run expectation lock", () => {
  it("locks the published dry-run counts", () => {
    assert.equal(EXPECTED_DRY_RUN.read, 1089);
    assert.equal(EXPECTED_DRY_RUN.units, 1084);
    assert.equal(EXPECTED_DRY_RUN.withStats, 1013);
    assert.equal(EXPECTED_DRY_RUN.weapons, 211);
    assert.equal(EXPECTED_DRY_RUN.factions, 5);
    assert.equal(EXPECTED_DRY_RUN.merged, 4);
    assert.equal(EXPECTED_DRY_RUN.rejected, 1);
  });
});

describe("ETL synthetic fixture", () => {
  it("merges exact duplicates, rejects conflicts, normalizes typos", () => {
    const mapping = loadMapping(root);
    const rows = loadLocalCsvs(mapping, resolve("etl/fixtures/synthetic"));
    const { report, drafts } = transformRows({
      root,
      patch: "fixture",
      rows,
      dryRun: true,
      compareExpected: false,
      persistSlugs: false,
    });

    assert.ok(report.counts.read >= 10);
    assert.equal(report.counts.merged, 2, "Churchill + GAZ exact merges");
    assert.equal(report.counts.rejected, 1, "Universal Mk.I crew conflict");
    assert.ok(
      drafts.some((d) => d.name === "Cavalry Rifle Squad"),
      "Calvary → Cavalry",
    );
    assert.ok(
      drafts.some((d) => d.name === "Rifle Squad" && d.extra.ie_id),
      "embedded IE id stripped",
    );
    const officer = drafts.find((d) => d.name === "Officer");
    assert.ok(officer);
    assert.ok(
      !officer.costs.some((c) => c.kind === "cp"),
      "negative CP dropped",
    );
    assert.ok(
      report.issues.some((i) => i.code === "negative" && i.message.includes("-25")),
      "negative CP logged",
    );
    const hummel = drafts.find((d) => d.name === "Hummel");
    assert.ok(hummel);
    assert.equal(hummel.costs.length, 0, "unit not specified costs skipped");
    assert.ok(hummel.unitTypeCode === "spg", "Hummel typed as SPG");
    const willys = drafts.filter((d) => d.name.startsWith("Willys"));
    assert.equal(willys.length, 2, "weapon variants kept");
    assert.ok(drafts.every((d) => d.slug && /^[a-z0-9][a-z0-9-]{0,79}$/.test(d.slug)));
  });

  it("is idempotent on repeated transform (zero logical changes)", () => {
    const mapping = loadMapping(root);
    const rows = loadLocalCsvs(mapping, resolve("etl/fixtures/synthetic"));
    const a = transformRows({
      root,
      patch: "fixture",
      rows,
      dryRun: true,
      persistSlugs: false,
    });
    const b = transformRows({
      root,
      patch: "fixture",
      rows,
      dryRun: true,
      persistSlugs: false,
    });
    assert.equal(a.drafts.length, b.drafts.length);
    assert.deepEqual(
      a.drafts.map((d) => d.slug).sort(),
      b.drafts.map((d) => d.slug).sort(),
    );
    assert.deepEqual(a.report.counts, b.report.counts);
  });
});

describe("ETL security guards", () => {
  it("refuses owner and app-ro DATABASE_URL_ETL users", () => {
    assert.throws(
      () =>
        assertEtlDatabaseUrl(
          "postgres://neondb_owner@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_etl/,
    );
    assert.throws(
      () =>
        assertEtlDatabaseUrl(
          "postgres://goh_app_ro@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_etl/,
    );
    assert.doesNotThrow(() =>
      assertEtlDatabaseUrl(
        "postgres://goh_etl@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
      ),
    );
  });
});

describe("normalize helpers", () => {
  it("normalizes weapon case/typos for slug collapse", () => {
    assert.equal(
      normalizeWeaponName("7.5cm Kwk 40 L/43", root),
      "7.5cm KwK 40 L/43",
    );
    assert.equal(normalizeWeaponName("Bofor 40mm", root).includes("Bofors"), true);
    assert.equal(normalizeWeaponName("BREN Mk.II", root), "Bren Mk.II");
    const { name } = normalizeUnitName("GroBdeutschland Rifle Squad", root);
    assert.equal(name, "Großdeutschland Rifle Squad");
    assert.ok(makeSlug("Großdeutschland Rifle Squad").startsWith("gross"));
  });
});

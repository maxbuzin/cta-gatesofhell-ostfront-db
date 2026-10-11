import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

// Mirror the gate regex from ci-security-gates.mjs for unit coverage.
const OWNER_MIGRATE_RE =
  /db\s*:\s*migrate|drizzle[\s_-]*kit[\s"'`]*[\s]+(?:migrate|push)|["'`]drizzle[\s_-]*kit["'`][\s]+(?:migrate|push)|DATABASE_URL_OWNER/i;

describe("owner-migrate CI guard regex", () => {
  it("matches spacing/quoting/case variants", () => {
    const hits = [
      "db:migrate",
      "DB:MIGRATE",
      "db : migrate",
      "pnpm db:migrate",
      "drizzle-kit migrate",
      "drizzle-kit  push",
      "drizzle_kit migrate",
      "drizzle kit migrate",
      `"drizzle-kit" migrate`,
      `'drizzle-kit' push`,
      "DATABASE_URL_OWNER",
      "database_url_owner=x",
    ];
    for (const s of hits) {
      assert.equal(OWNER_MIGRATE_RE.test(s), true, s);
    }
  });

  it("does not match safe references", () => {
    const misses = [
      "db:generate",
      "drizzle-kit generate",
      "drizzle-kit studio",
      "DATABASE_URL",
      "DATABASE_URL_ETL",
    ];
    for (const s of misses) {
      assert.equal(OWNER_MIGRATE_RE.test(s), false, s);
    }
  });

  it("matches the regex embedded in ci-security-gates.mjs", () => {
    const src = readFileSync("scripts/ci-security-gates.mjs", "utf8");
    assert.match(src, /OWNER_MIGRATE_RE/);
    assert.match(src, /DATABASE_URL_OWNER/i);
    assert.match(src, /migrate\|push/);
  });
});

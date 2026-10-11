import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { withQueryFallback } from "../src/lib/safe-query.ts";

describe("cache poisoning guard", () => {
  it("withQueryFallback returns empty at call site when inner throws", async () => {
    const result = await withQueryFallback(
      async () => {
        throw new Error("db down");
      },
      [],
      "Failed to load",
    );
    assert.deepEqual(result, []);
  });

  it("cached query module does not swallow DB errors with empty catch", () => {
    const src = readFileSync("src/lib/db/queries/units.ts", "utf8");
    // decodeCursor lives elsewhere; units.ts must not catch-and-return-empty
    assert.equal(
      /console\.error\("Failed to/.test(src),
      false,
      "units.ts must not catch DB errors inside 'use cache' functions",
    );
    // Only remaining try/catch should be absent for DB paths
    const catches = [...src.matchAll(/\} catch \{/g)];
    assert.equal(
      catches.length,
      0,
      "units.ts should have no catch blocks (cursor decode moved out)",
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCompareUnitSlugs } from "../src/lib/compare-params.ts";

describe("parseCompareUnitSlugs", () => {
  it("parses comma-separated string", () => {
    assert.deepEqual(parseCompareUnitSlugs("tiger-i,t-34"), [
      "tiger-i",
      "t-34",
    ]);
  });

  it("flattens repeated units params (string[])", () => {
    assert.deepEqual(parseCompareUnitSlugs(["a", "b"]), ["a", "b"]);
    assert.deepEqual(parseCompareUnitSlugs(["x,y", "z"]), ["x", "y", "z"]);
  });

  it("dedupes and caps at 4", () => {
    assert.deepEqual(
      parseCompareUnitSlugs("a,b,a,c,d,e"),
      ["a", "b", "c", "d"],
    );
  });

  it("drops invalid slugs; never throws", () => {
    assert.deepEqual(parseCompareUnitSlugs("OK,bad slug,</style>"), []);
    assert.deepEqual(parseCompareUnitSlugs(["good-unit", "!!"]), ["good-unit"]);
    assert.deepEqual(parseCompareUnitSlugs(undefined), []);
    assert.deepEqual(parseCompareUnitSlugs(null), []);
  });
});

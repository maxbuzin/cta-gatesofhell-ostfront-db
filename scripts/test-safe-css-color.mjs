import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSafeChartKey,
  safeCssColor,
  SAFE_CSS_FALLBACK,
} from "../src/lib/safe-css-color.ts";

describe("safeCssColor", () => {
  it("accepts #rgb and #rrggbb", () => {
    assert.equal(safeCssColor("#abc"), "#abc");
    assert.equal(safeCssColor("#A1B2C3"), "#A1B2C3");
  });

  it("rejects XSS / CSS injection payloads", () => {
    const bad = [
      "</style><script>",
      "red;}body{display:none",
      "red",
      "url(javascript:alert(1))",
      "#gggggg",
      "#12345",
      "var(--primary)",
    ];
    for (const v of bad) {
      assert.equal(safeCssColor(v), SAFE_CSS_FALLBACK, v);
    }
  });
});

describe("isSafeChartKey", () => {
  it("allows index keys only", () => {
    assert.equal(isSafeChartKey("u0"), true);
    assert.equal(isSafeChartKey("u3"), true);
    assert.equal(isSafeChartKey("germany"), false);
    assert.equal(isSafeChartKey("</style><script>"), false);
    assert.equal(isSafeChartKey("count"), false);
  });
});

describe("ChartStyle emission contract", () => {
  it("never emits unsafe key or color into CSS text", () => {
    const entries = [
      ["germany", "</style><script>alert(1)</script>"],
      ["u0", "red;}body{display:none"],
      ["u1", "#c0443a"],
    ];
    const css = entries
      .filter(([key]) => isSafeChartKey(key))
      .map(([key, color]) => `  --color-${key}: ${safeCssColor(color)};`)
      .join("\n");
    assert.equal(css.includes("germany"), false);
    assert.equal(css.includes("</style>"), false);
    assert.equal(css.includes("script"), false);
    assert.equal(css.includes("display:none"), false);
    assert.match(css, /--color-u0: #7A8B5C;/);
    assert.match(css, /--color-u1: #c0443a;/);
  });
});

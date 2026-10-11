import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  assertProductionDatabaseUrl,
  isProductionRuntime,
} from "../src/lib/env-guards.ts";

const keys = ["NODE_ENV", "VERCEL_ENV", "NEXT_PHASE", "DATABASE_URL"];

describe("env preview vs production", () => {
  /** @type {Record<string, string | undefined>} */
  let prev;

  beforeEach(() => {
    prev = {};
    for (const k of keys) prev[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it("treats Vercel preview as non-production (no DB required)", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.NEXT_PHASE;
    assert.equal(isProductionRuntime(), false);
    assert.doesNotThrow(() =>
      assertProductionDatabaseUrl("postgres://x@host/db"),
    );
  });

  it("treats Vercel production as strict", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PHASE;
    assert.equal(isProductionRuntime(), true);
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://neondb_owner@ep-x.us-east-1.aws.neon.tech/neondb",
        ),
      /pooler|goh_app_ro/,
    );
    assert.doesNotThrow(() =>
      assertProductionDatabaseUrl(
        "postgres://goh_app_ro@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
      ),
    );
  });

  it("skips DB URL checks during production build phase", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PHASE = "phase-production-build";
    assert.equal(isProductionRuntime(), false);
  });
});

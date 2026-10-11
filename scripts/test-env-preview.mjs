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

  it("allows Vercel preview without DATABASE_URL (empty states)", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.NEXT_PHASE;
    assert.equal(isProductionRuntime(), false);
  });

  it("rejects owner / non-goh_app_ro URLs on Vercel preview", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.NEXT_PHASE;
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://neondb_owner@ep-x.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_app_ro|owner/,
    );
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://other@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_app_ro/,
    );
    assert.doesNotThrow(() =>
      assertProductionDatabaseUrl(
        "postgres://goh_app_ro@ep-x-pooler.us-east-1.aws.neon.tech/neondb",
      ),
    );
  });

  it("treats Vercel production as strict (user + pooler)", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PHASE;
    assert.equal(isProductionRuntime(), true);
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://neondb_owner@ep-x.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_app_ro|owner|pooler/,
    );
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://goh_app_ro@ep-x.us-east-1.aws.neon.tech/neondb",
        ),
      /pooler/,
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
    // Build phase is not preview/production deploy enforcement for pooler,
    // but VERCEL_ENV=production still blocks owner users.
    assert.throws(
      () =>
        assertProductionDatabaseUrl(
          "postgres://neondb_owner@ep-x.us-east-1.aws.neon.tech/neondb",
        ),
      /goh_app_ro|owner/,
    );
  });
});

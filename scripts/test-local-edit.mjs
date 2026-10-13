import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { mapSnapshot } from "../etl/snapshot-map.mjs";
import {
  applyDisplayedStat,
  displayedStatFields,
  isEditBody,
  localEditsAllowed,
  parseLocalEdit,
  patchResearchUnits,
  replaceUnitAt,
  sameUnitIdentity,
  writeSnapshotFile,
} from "../src/lib/local-edit-guard.ts";

const env = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
};

afterEach(() => {
  if (env.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = env.NODE_ENV;
  if (env.VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = env.VERCEL;
});

function allow(nodeEnv, vercel, host) {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = vercel;
  return localEditsAllowed(host);
}

describe("localEditsAllowed", () => {
  it("allows loopback only in development without Vercel", () => {
    assert.equal(allow("development", undefined, "localhost:3000"), true);
    assert.equal(allow("development", undefined, "127.0.0.1:3000"), true);
    assert.equal(allow("development", undefined, "[::1]:3000"), true);
    assert.equal(allow("development", undefined, "0.0.0.0:3000"), false);
    assert.equal(allow("development", undefined, "example.com"), false);
    assert.equal(allow("production", undefined, "localhost:3000"), false);
    assert.equal(allow("development", "1", "localhost:3000"), false);
    assert.equal(allow("test", undefined, "localhost"), false);
  });
});

describe("unit identity", () => {
  const current = { id: "m4a1", roster: "conquest", side: "usa", period: "late" };

  it("keeps id, roster, side, and period", () => {
    assert.equal(sameUnitIdentity(current, { ...current, name: "Sherman" }), true);
    assert.equal(sameUnitIdentity(current, { ...current, side: "USA" }), false);
    assert.equal(sameUnitIdentity(current, { ...current, id: "m4a2" }), false);
  });

  it("replaces one array element", () => {
    const units = [current, { id: "other", roster: "conquest", side: "ger", period: "mid" }];
    const next = { ...current, name: "M4A1" };
    const result = replaceUnitAt(units, 0, next);
    assert.equal(result.ok, true);
    assert.equal(units[0], next);
    assert.equal(replaceUnitAt(units, 0, { ...next, period: "early" }).ok, false);
    assert.equal(units[0].period, "late");
  });
});

describe("research patch", () => {
  it("writes costs and requires onto every matching unit", () => {
    const units = [
      {
        id: "m4a1",
        side: "usa",
        research: { id: "m4a1(usa)", side: "usa", requires: ["m3(usa)"], costs: 1 },
      },
      {
        id: "m4a1_late",
        side: "usa",
        research: { id: "m4a1(usa)", side: "usa", requires: ["m3(usa)"], costs: 1 },
      },
      {
        id: "pz4",
        side: "ger",
        research: { id: "m4a1(usa)", side: "ger", requires: [], costs: 9 },
      },
    ];
    const patched = patchResearchUnits(units, "usa", "m4a1-usa", 4, ["stuart(usa)"]);
    assert.equal(patched.count, 2);
    assert.equal(units[0].research.costs, 4);
    assert.deepEqual(units[1].research.requires, ["stuart(usa)"]);
    assert.equal(units[2].research.costs, 9);
    patched.undo();
    assert.equal(units[0].research.costs, 1);
  });

  it("stores the raw index on mapped records", () => {
    const mapped = mapSnapshot({
      units: [
        { id: "skip", name: "Skip" },
        { id: "m4a1", name: "Sherman", roster: "conquest", side: "usa", period: "late" },
      ],
    });
    assert.equal(mapped.records[0].sourceIndex, 1);
  });
});

describe("displayed stats", () => {
  const unit = {
    id: "m4a1",
    name: "Sherman",
    cp: 10,
    cost: 100,
    vehicle: {
      mobility: { speed: 40 },
      armor: [
        { volume: "body", front: 51 },
        { volume: "turret", front: 76 },
      ],
    },
    weapons: [
      { id: "gun", place: "gun", calibre: 75, reload: 5, ap: { pointBlank: 90, at100: 80 } },
      { id: "mg", place: "hull", calibre: 7.62, reload: 1 },
    ],
  };

  it("writes name, speed, reload, penetration, and hull armor", () => {
    assert.deepEqual(
      [...displayedStatFields(unit)].sort(),
      ["armor", "cost", "cp", "name", "penetration", "reload", "speed"],
    );
    const speed = applyDisplayedStat(unit, "speed", 42);
    assert.equal(speed.ok, true);
    assert.equal(unit.vehicle.mobility.speed, 42);
    speed.undo();
    assert.equal(unit.vehicle.mobility.speed, 40);
    assert.equal(applyDisplayedStat(unit, "reload", 6).ok, true);
    assert.equal(unit.weapons[0].reload, 6);
    assert.equal(unit.weapons[1].reload, 1);
    assert.equal(applyDisplayedStat(unit, "penetration", 100).ok, true);
    assert.equal(unit.weapons[0].ap.pointBlank, 100);
    assert.equal(applyDisplayedStat(unit, "armor", 60).ok, true);
    assert.equal(unit.vehicle.armor[0].front, 60);
    assert.equal(unit.vehicle.armor[1].front, 76);
    assert.equal(applyDisplayedStat(unit, "name", "M4A1").ok, true);
    assert.equal(unit.name, "M4A1");
  });

  it("skips speed and weapons when the snapshot has neither", () => {
    const infantry = { id: "a", name: "Rifle", cp: 1, cost: 20 };
    assert.deepEqual(displayedStatFields(infantry), ["name", "cp", "cost"]);
    assert.equal(applyDisplayedStat(infantry, "speed", 5).ok, false);
    assert.equal(applyDisplayedStat(infantry, "reload", 1).ok, false);
  });

  it("parses a stat edit", () => {
    const parsed = parseLocalEdit({ kind: "stat", slug: "conquest-usa-late-m4a1", field: "speed", value: 40 });
    assert.equal(isEditBody(parsed), true);
    assert.equal(isEditBody(parseLocalEdit({ kind: "stat", slug: "conquest-usa-late-m4a1", field: "hp", value: 1 })), false);
  });
});

describe("parseLocalEdit", () => {
  it("accepts a unit object and a research block", () => {
    const unit = parseLocalEdit({
      kind: "unit",
      slug: "conquest-usa-late-m4a1",
      unit: { id: "m4a1" },
    });
    assert.equal(isEditBody(unit), true);
    const research = parseLocalEdit({
      kind: "research",
      factionSlug: "usa",
      nodeSlug: "m4a1-usa",
      costs: null,
      requires: ["m3(usa)"],
    });
    assert.equal(isEditBody(research), true);
    assert.equal(isEditBody(parseLocalEdit({ kind: "unit", slug: "Bad", unit: {} })), false);
  });
});

describe("writeSnapshotFile", () => {
  it("replaces the file via a temp rename", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "local-edit-"));
    const file = path.join(dir, "game-units.json");
    try {
      writeSnapshotFile({ units: [{ id: "a" }] }, file);
      assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { units: [{ id: "a" }] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

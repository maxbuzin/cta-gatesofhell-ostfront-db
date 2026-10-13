import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapSnapshot } from "../etl/snapshot-map.mjs";

const doc = {
  units: [
    {
      id: "single_officer",
      name: "Officer",
      roster: "conquest",
      side: "eng",
      period: "mid",
      cp: 2,
      cost: 125,
      members: [{ breed: "plt_com", count: 1 }],
      weapons: [
        {
          id: "webley_mk6",
          name: "Webley",
          calibre: 11.6,
          reload: 8,
          rpm: 20,
          range: 50,
        },
      ],
    },
    {
      id: "m4a1",
      name: "Sherman",
      roster: "conquest",
      side: "usa",
      period: "late",
      cp: 5,
      cost: 400,
      members: [{ breed: "crew", count: 5 }],
      vehicle: {
        mobility: {
          kind: "mobility_tank",
          speed: 40,
          reverse: 6,
          traverse: 30,
          weight: 30.3,
          fuel: 680,
        },
        armor: [
          { volume: "body1", front: 50.8, side: 38.1, rear: 38.1, top: 19 },
          { volume: "turret", front: 76.2, side: 50.8, rear: 50.8, top: 25.4 },
        ],
      },
      weapons: [
        {
          id: "75mm_m3",
          name: "75mm M3",
          calibre: 75,
          reload: 6.5,
          rpm: 12,
          range: 200,
          place: "gun",
          ap: { shell: "ap", pointBlank: 90, at100: 80 },
          ammo: [
            {
              shell: "ap",
              pen: { 10: 100, 100: 80 },
            },
          ],
        },
      ],
      research: {
        id: "m4a1(usa)",
        side: "usa",
        requires: ["m3(usa)"],
        costs: 4,
      },
    },
    {
      id: "inf_crate_eng",
      name: "Crate",
      roster: "conquest",
      side: null,
    },
  ],
};

describe("mapSnapshot", () => {
  const mapped = mapSnapshot(doc);
  const officer = mapped.records.find((row) => row.slug === "conquest-eng-mid-single-officer");
  const sherman = mapped.records.find((row) => row.slug === "conquest-usa-late-m4a1");

  it("maps an infantry row and an armored vehicle", () => {
    assert.ok(officer);
    assert.equal(officer.factionSlug, "british");
    assert.equal(officer.typeCode, "infantry_squad");
    assert.equal(officer.squadSize, 1);
    assert.deepEqual(officer.costs, [
      { kind: "cp", amount: 2 },
      { kind: "resources", amount: 125 },
    ]);
    assert.ok(sherman);
    assert.equal(sherman.factionSlug, "usa");
    assert.equal(sherman.typeCode, "tank");
    assert.equal(sherman.crewSize, 5);
    assert.equal(sherman.stats.speedRoadKmh, 40);
    assert.equal(sherman.stats.armorFrontMm, 51);
    assert.equal(sherman.stats.turretFrontMm, 76);
    assert.equal(sherman.stats.penetrationMm, 90);
  });

  it("skips a unit with no side", () => {
    assert.equal(mapped.records.length, 2);
    assert.deepEqual(mapped.skipped, [{ id: "inf_crate_eng", reason: "side" }]);
  });

  it("keeps a penetration point", () => {
    const ammo = sherman.weapons[0].ammo[0];
    assert.equal(ammo.kind, "AP");
    assert.deepEqual(ammo.pen, [
      { rangeM: 10, mm: 100 },
      { rangeM: 100, mm: 80 },
    ]);
  });

  it("summarizes the mounted gun and keeps nulls", () => {
    const mapped = mapSnapshot({
      units: [
        {
          id: "panzerjager1",
          name: "Panzerjäger I",
          roster: "conquest",
          side: "ger",
          period: "mid",
          cp: 17,
          cost: 298,
          vehicle: { mobility: { kind: "mobility_tank", speed: 40 } },
          weapons: [
            {
              id: "47mm_pakt_2",
              name: "4.7cm PaK(t)",
              place: "gun",
              calibre: null,
              range: null,
              reload: null,
            },
            {
              id: "mp38_folded",
              name: "MP 38",
              calibre: 9,
              reload: 3.25,
            },
          ],
        },
      ],
    });
    const row = mapped.records[0];
    assert.equal(row.stats.caliberMm, null);
    assert.equal(row.stats.rangeM, null);
    assert.equal(row.stats.reloadS, null);
    assert.equal(row.stats.extra.roster, "conquest");
    assert.equal(row.stats.extra.period, "mid");
  });

  it("records research requires", () => {
    const node = mapped.research.find((row) => row.slug === "m4a1-usa");
    const stub = mapped.research.find((row) => row.slug === "m3-usa");
    assert.ok(node);
    assert.deepEqual(node.requires, ["m3-usa"]);
    assert.deepEqual(node.unitSlugs, ["conquest-usa-late-m4a1"]);
    assert.ok(stub);
    assert.equal(stub.factionSlug, "usa");
    assert.equal(stub.name, "M3 Usa");
    assert.deepEqual(stub.requires, []);
    assert.deepEqual(stub.unitSlugs, []);
  });

  it("keeps one record per faction and game id", () => {
    const mapped = mapSnapshot({
      units: [
        {
          id: "single_officer",
          name: "Officer",
          roster: "early",
          side: "eng",
          period: "early",
          cp: 3,
          cost: 125,
        },
        {
          id: "single_officer",
          name: "Officer",
          roster: "conquest",
          side: "eng",
          period: "mid",
          cp: 2,
          cost: 125,
          research: { id: "single_officer(eng)", requires: [], costs: 1 },
        },
        {
          id: "single_officer",
          name: "Officer",
          roster: "late",
          side: "eng",
          period: "late",
          cp: 3,
          cost: 125,
        },
      ],
    });
    assert.equal(mapped.records.length, 1);
    assert.equal(mapped.records[0].sourceIndex, 1);
    assert.equal(mapped.records[0].costs.find((cost) => cost.kind === "cp").amount, 2);
  });

  it("names a stub from a unit with no research", () => {
    const mapped = mapSnapshot({
      units: [
        {
          id: "single_officer",
          name: "Officer",
          roster: "conquest",
          side: "eng",
          period: "mid",
        },
        {
          id: "squad_officer_con",
          name: "Platoon HQ",
          roster: "conquest",
          side: "eng",
          period: "mid",
          research: {
            id: "squad_officer_con(eng)",
            side: "eng",
            requires: ["single_officer(eng)"],
            costs: 2,
          },
        },
      ],
    });
    const stub = mapped.research.find((row) => row.slug === "single-officer-eng");
    const hq = mapped.research.find((row) => row.slug === "squad-officer-con-eng");
    assert.ok(stub);
    assert.equal(stub.name, "Officer");
    assert.equal(stub.researchCost, null);
    assert.deepEqual(stub.unitSlugs, ["conquest-eng-mid-single-officer"]);
    assert.ok(hq);
    assert.deepEqual(hq.requires, ["single-officer-eng"]);
  });
});

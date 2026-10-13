import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TABS,
  ammoKind,
  childSlug,
  indexHeaders,
  mapFaction,
  mapRow,
  mapSheet,
  shortNameOf,
  unitSlug,
} from "../etl/sheet-map.mjs";

const dash = String.fromCharCode(0x2013);

const infantryHeaders = [
  "Unit",
  "Faction",
  "Main Specialty",
  `Helmet (CP ${dash} deploy points)`,
  `Shield (Cost ${dash} resources)`,
  "Tier",
  "Starting veterancy",
  "Health per soldier (HP)",
  "Squad size",
  "Rifles (bolt)",
  "Semi-auto rifles",
  "SMGs",
  "MGs",
  "AT weapons",
  "Sniper rifles",
  "Line of sight (m)",
  "Source",
  `Notes ${String.fromCharCode(0x2014)} Specialty is derived`,
  "Grenades (min)",
  "Grenades (max)",
  "Main weapons",
];

const tankHeaders = [
  "Unit",
  "Speed (km/h)",
  "Reload (s)",
  "Turret armor max (mm)",
  "Hull armor max (mm)",
  "Pen AP point-blank (mm)",
  "Pen APCR/HVAP point-blank (mm)",
  "HEAT pen (mm)",
  "Calibre (mm)",
  "Range AP (m)",
  "Range HE (m)",
  "Faction",
  "Class",
  "Main Specialty",
  `Helmet (CP ${dash} deploy points)`,
  `Shield (Cost ${dash} resources)`,
  "Max field of view (m)",
  "Notes",
  "Pen AP @100m (mm)",
  "Extra armor max (mm)",
  "Main gun",
  "Ammo types",
  "Crew",
  "Max occupants",
];

describe("mapFaction", () => {
  it("maps sheet names onto canonical slugs", () => {
    assert.equal(mapFaction("Germany"), "germany");
    assert.equal(mapFaction("USSR"), "ussr");
    assert.equal(mapFaction("USA"), "usa");
    assert.equal(mapFaction("Finland"), "finland");
    assert.equal(mapFaction("Commonwealth"), "british");
    assert.equal(mapFaction("British Commonwealth"), "british");
    assert.equal(mapFaction("UK"), "british");
    assert.equal(mapFaction("Japan"), "japan");
    assert.equal(mapFaction("Italy"), null);
    assert.equal(mapFaction(""), null);
  });
});

describe("ammoKind", () => {
  it("maps sheet ammo labels onto the enum", () => {
    assert.equal(ammoKind("AP"), "AP");
    assert.equal(ammoKind("APHE"), "APHE");
    assert.equal(ammoKind("APCR"), "APCR");
    assert.equal(ammoKind("HVAP"), "APCR");
    assert.equal(ammoKind("HEAT"), "HEAT");
    assert.equal(ammoKind("HE"), "HE");
    assert.equal(ammoKind("APC"), "Other");
    assert.equal(ammoKind("APC-HE"), "APHE");
  });
});

describe("unitSlug", () => {
  it("suffixes duplicate names and stays inside the slug rule", () => {
    const taken = new Set();
    const first = unitSlug("finland", "Rifle Squad", taken);
    const second = unitSlug("finland", "Rifle Squad", taken);
    assert.equal(first, "finland-rifle-squad");
    assert.equal(second, "finland-rifle-squad-2");
    assert.match(first, /^[a-z0-9][a-z0-9-]{0,79}$/);
    const long = unitSlug("germany", "x".repeat(200), taken);
    const long2 = unitSlug("germany", "x".repeat(200), taken);
    assert.ok(long.length <= 64);
    assert.ok(long2.length <= 64);
    assert.notEqual(long, long2);
    assert.match(long2, /-[0-9]+$/);
  });
});

describe("childSlug", () => {
  it("keeps a shorter unit slug from matching a longer one", () => {
    const short = childSlug("finland-rifle", "ap");
    const longer = childSlug("finland-rifle-squad", "ap");
    assert.equal(short, "finland-rifle--ap");
    assert.equal(longer, "finland-rifle-squad--ap");
    assert.equal(longer.startsWith("finland-rifle--"), false);
  });
});

describe("shortNameOf", () => {
  it("keeps parenthetical game ids", () => {
    assert.equal(
      shortNameOf("Rifle Squad (squad_rifle_early_con)"),
      "squad_rifle_early_con",
    );
    assert.equal(shortNameOf("Kfz. 1 (Command)"), null);
    assert.equal(shortNameOf("ba20_command"), "ba20_command");
  });
});

describe("indexHeaders", () => {
  it("finds faction when it is not the second column", () => {
    const index = indexHeaders(tankHeaders);
    assert.equal(index.get("faction"), 11);
    assert.equal(index.get("cp"), 14);
    assert.equal(index.get("unit"), 0);
  });
});

describe("mapRow", () => {
  it("maps an infantry row", () => {
    const taken = new Set();
    const { record } = mapRow(
      infantryHeaders,
      [
        "Civil Guard Squad",
        "Finland",
        "Anti-Infantry / Defense / Hold Line / Rush / Flank",
        "20",
        "69",
        "",
        "",
        "",
        "10",
        "9",
        "0",
        "0",
        "1",
        "0",
        "0",
        "",
        "Fandom wiki",
        "",
        "0",
        "10",
        "5x Mosin Nagant",
      ],
      TABS[0],
      taken,
      2,
    );
    assert.equal(record.slug, "finland-civil-guard-squad");
    assert.equal(record.factionSlug, "finland");
    assert.equal(record.typeCode, "infantry_squad");
    assert.deepEqual(record.costs, [
      { kind: "cp", amount: 20 },
      { kind: "resources", amount: 69 },
    ]);
    assert.deepEqual(
      record.specialties.map((spec) => spec.slug),
      ["anti-infantry", "defense", "hold-line", "rush", "flank"],
    );
    assert.equal(record.stats.rifles, 9);
    assert.equal(record.stats.semiAuto, 0);
    assert.equal(record.stats.mgs, 1);
    assert.equal(record.stats.extra.grenadesMin, 0);
    assert.equal(record.stats.extra.grenadesMax, 10);
    assert.equal(record.stats.extra.sourceNote, "Fandom wiki");
    assert.equal(record.stats.extra.mainWeapons, "5x Mosin Nagant");
    assert.equal(record.weapon, null);
    assert.equal(record.squadSize, 10);
  });

  it("maps a tank row by header name", () => {
    const { record } = mapRow(
      tankHeaders,
      [
        "Pz.Kpfw 35(t)",
        "34",
        "6",
        "25",
        "25",
        "54",
        "101",
        "",
        "37",
        "160",
        "160",
        "Germany",
        "Light",
        "Anti-Infantry",
        "",
        "",
        "",
        "",
        "36",
        "",
        "3.7cm KwK 34(t) L/40",
        "APHE, HE, APCR",
        "4",
        "",
      ],
      TABS[1],
      new Set(),
      2,
    );
    assert.equal(record.factionSlug, "germany");
    assert.equal(record.slug, "germany-pz-kpfw-35-t");
    assert.equal(record.typeCode, "tank");
    assert.deepEqual(record.costs, []);
    assert.equal(record.stats.speedRoadKmh, 34);
    assert.equal(record.stats.armorFrontMm, 25);
    assert.equal(record.stats.turretFrontMm, 25);
    assert.equal(record.stats.penetrationMm, 54);
    assert.equal(record.stats.caliberMm, 37);
    assert.equal(record.stats.rangeM, 160);
    assert.equal(record.stats.reloadS, 6);
    assert.equal(record.crewSize, 4);
    assert.equal(record.stats.extra.className, "Light");
    assert.equal(record.weapon.name, "3.7cm KwK 34(t) L/40");
    assert.match(record.weapon.slug, /--gun$/);
    const ap = record.ammo.find((row) => row.slug.endsWith("--ap"));
    const apcr = record.ammo.find((row) => row.slug.endsWith("--apcr"));
    const aphe = record.ammo.find((row) => row.slug.endsWith("--aphe"));
    assert.equal(ap.isDefault, true);
    assert.deepEqual(ap.pen, [
      { rangeM: 0, mm: 54 },
      { rangeM: 100, mm: 36 },
    ]);
    assert.deepEqual(apcr.pen, [{ rangeM: 0, mm: 101 }]);
    assert.equal(aphe.kind, "APHE");
    assert.equal(apcr.kind, "APCR");
  });

  it("skips unknown factions and blank names", () => {
    const taken = new Set();
    assert.equal(
      mapRow(["Unit", "Faction"], ["", "Germany"], TABS[0], taken).skip,
      "empty",
    );
    const skipped = mapRow(
      ["Unit", "Faction"],
      ["Ghost", "Italy"],
      TABS[0],
      taken,
    );
    assert.equal(skipped.skip, "faction");
    assert.equal(skipped.faction, "Italy");
    assert.equal(taken.size, 0);
  });
});

describe("mapSheet", () => {
  it("parses quoted commas and rejects a sheet with no unit header", () => {
    const csv = '"Unit","Faction"\n"Rifle, Squad",Commonwealth\n\n';
    const { records } = mapSheet(TABS[0], csv, new Set());
    assert.equal(records.length, 1);
    assert.equal(records[0].name, "Rifle, Squad");
    assert.equal(records[0].factionSlug, "british");
    assert.throws(
      () => mapSheet(TABS[0], "Foo,Bar\n1,2\n", new Set()),
      /Unit or Faction/,
    );
  });
});

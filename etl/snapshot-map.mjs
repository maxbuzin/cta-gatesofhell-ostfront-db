import {
  childSlug,
  claimSlug,
  fitSlug,
  searchFold,
  slugify,
} from "./sheet-map.mjs";

export const SNAPSHOT_FACTIONS = [
  { slug: "germany", nameEn: "Germany", color: "#5E6B73", sortOrder: 1 },
  { slug: "ussr", nameEn: "USSR", color: "#B23A2F", sortOrder: 2 },
  { slug: "usa", nameEn: "USA", color: "#4A6B3A", sortOrder: 3 },
  { slug: "british", nameEn: "British Commonwealth", color: "#A8834A", sortOrder: 4 },
  { slug: "finland", nameEn: "Finland", color: "#3E6FA8", sortOrder: 5 },
  { slug: "japan", nameEn: "Japan", color: "#C9C2B0", sortOrder: 6 },
  { slug: "canada", nameEn: "Canada", color: "#B85C38", sortOrder: 7 },
  { slug: "poland", nameEn: "Poland", color: "#8C3A4A", sortOrder: 8 },
];

export const SNAPSHOT_TYPES = [
  { code: "infantry_squad", category: "infantry", nameEn: "Infantry" },
  { code: "tank", category: "vehicle", nameEn: "Tanks" },
  { code: "armored_car", category: "vehicle", nameEn: "Armored Cars & Light Vehicles" },
  { code: "support_vehicle", category: "vehicle", nameEn: "Support Vehicles & Trucks" },
  { code: "at_gun", category: "gun", nameEn: "AT Guns" },
  { code: "aa_gun", category: "gun", nameEn: "AA Guns" },
  { code: "artillery", category: "gun", nameEn: "Artillery" },
  { code: "mortar", category: "gun", nameEn: "Mortars & Rockets" },
  { code: "mg_emplacement", category: "emplacement", nameEn: "MG Emplacements" },
];

const SIDES = {
  ger: "germany",
  rus: "ussr",
  usa: "usa",
  eng: "british",
  fin: "finland",
  can: "canada",
  pol: "poland",
};

const FACTION_SIDE = Object.fromEntries(
  Object.entries(SIDES).map(([code, slug]) => [slug, code]),
);

export function factionSlugOf(side) {
  return SIDES[String(side || "").toLowerCase()] ?? null;
}

const AMMO_KINDS = [
  ["APDS", "APDS"],
  ["APCR", "APCR"],
  ["HVAP", "APCR"],
  ["APHEBC", "APHE"],
  ["APCBC", "AP"],
  ["APCHE", "APHE"],
  ["APHE", "APHE"],
  ["HEAT", "HEAT"],
  ["HESH", "HESH"],
  ["SMOKE", "Smoke"],
  ["SHRAPNEL", "Shrapnel"],
  ["TRACER", "Tracer"],
  ["BALL", "Ball"],
  ["APBC", "AP"],
  ["APC", "AP"],
  ["HE", "HE"],
  ["AP", "AP"],
];

function finite(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function dec(raw, digits, max) {
  const n = finite(raw);
  if (n == null || n < 0 || n > max) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function small(raw) {
  const n = finite(raw);
  if (n == null) return null;
  const v = Math.round(n);
  if (v < 0 || v > 32767) return null;
  return v;
}

function whole(raw, max = 1_000_000) {
  const n = finite(raw);
  if (n == null) return null;
  const v = Math.round(n);
  if (v < 0 || v > max) return null;
  return v;
}

function costAmount(raw) {
  return whole(raw, 2_000_000_000);
}

export function ammoKindOf(shell) {
  const compact = String(shell || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!compact) return "Other";
  for (const [key, kind] of AMMO_KINDS) {
    if (compact === key || compact.startsWith(key)) return kind;
  }
  return "Other";
}

export function unitTypeCode(unit) {
  const id = String(unit?.id || "").toLowerCase();
  const kind = String(unit?.vehicle?.mobility?.kind || "");
  const armored = Array.isArray(unit?.vehicle?.armor) && unit.vehicle.armor.length > 0;
  if (/emplacement|sandbag|trench|bunker|nest/.test(id)) return "mg_emplacement";
  if (kind === "mobility_cannon") {
    if (/trailer|crate|wagon|limber|cart/.test(id)) return "support_vehicle";
    if (/flak|polsten|oerlikon|bofors|(^|_)aa(_|$)|anti_air/.test(id)) return "aa_gun";
    if (/mortar|rocket|nebel|katyusha/.test(id)) return "mortar";
    if (/howitzer|artillery|lefh|leig|ml20|ml-20/.test(id)) return "artillery";
    if (/_mg|mg_|vickers|maxim|browning/.test(id)) return "mg_emplacement";
    return "at_gun";
  }
  if (!unit?.vehicle) {
    if (/flak|polsten|oerlikon|bofors|(^|_)aa(_|$)/.test(id)) return "aa_gun";
    if (/mortar|nebel|katyusha/.test(id)) return "mortar";
    if (/howitzer|artillery/.test(id)) return "artillery";
    if (/(^|_)(at_)?gun(_|$)|(^|_)pak\d|pak_/.test(id)) return "at_gun";
    return "infantry_squad";
  }
  if (/halftrack|carrier|truck|kubel|ketten/.test(id) && !kind) {
    return armored ? "armored_car" : "support_vehicle";
  }
  if (kind === "mobility_tank" || kind === "mobility_tank_slow") {
    return armored ? "tank" : "support_vehicle";
  }
  if (kind === "mobility_car" || kind === "mobility_btr" || kind === "mobility_goliath") {
    return armored ? "armored_car" : "support_vehicle";
  }
  return armored ? "tank" : "support_vehicle";
}

function maxFace(plates, face) {
  let best = null;
  for (const plate of plates) {
    const n = small(plate?.[face]);
    if (n == null) continue;
    if (best == null || n > best) best = n;
  }
  return best;
}

function armorOf(plates) {
  const list = Array.isArray(plates) ? plates : [];
  const turret = list.filter((plate) => /turret|gun/i.test(String(plate?.volume || "")));
  const hull = list.filter((plate) => !/turret|gun/i.test(String(plate?.volume || "")));
  const body = hull.length ? hull : list;
  return {
    armorFrontMm: maxFace(body, "front"),
    armorSideMm: maxFace(body, "side"),
    armorRearMm: maxFace(body, "rear"),
    armorTopMm: maxFace(body, "top"),
    turretFrontMm: maxFace(turret, "front"),
    turretSideMm: maxFace(turret, "side"),
    turretRearMm: maxFace(turret, "rear"),
  };
}

function penPoints(pen) {
  if (!pen || typeof pen !== "object") return [];
  const byRange = new Map();
  for (const [key, value] of Object.entries(pen)) {
    const rangeM = whole(key);
    const mm = dec(value, 1, 99999.9);
    if (rangeM == null || mm == null) continue;
    byRange.set(rangeM, mm);
  }
  return [...byRange.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rangeM, mm]) => ({ rangeM, mm }));
}

function buildAmmo(weaponSlugValue, shells, caliberMm) {
  const list = Array.isArray(shells) ? shells : [];
  const taken = new Set();
  let prefer = list.findIndex((shell) => String(shell?.shell || "").toLowerCase() === "ap");
  if (prefer < 0) prefer = list.findIndex((shell) => ammoKindOf(shell?.shell) === "AP");
  if (prefer < 0) prefer = 0;
  const rows = [];
  list.forEach((shell, index) => {
    const label = String(shell?.shell || "").trim();
    if (!label) return;
    const tail = fitSlug(slugify(label), 14) || "ammo";
    const base = childSlug(weaponSlugValue, tail);
    if (!base) return;
    const slug = claimSlug(base, taken, 80);
    if (!slug) return;
    rows.push({
      slug,
      name: label.slice(0, 120),
      kind: ammoKindOf(label),
      caliberMm,
      isDefault: index === prefer,
      pen: penPoints(shell.pen),
    });
  });
  if (rows.length && !rows.some((row) => row.isDefault)) rows[0].isDefault = true;
  return rows;
}

function mapWeapons(rawWeapons) {
  const list = Array.isArray(rawWeapons) ? rawWeapons : [];
  const used = new Set();
  const out = [];
  for (const raw of list) {
    const slug = fitSlug(slugify(String(raw?.id || "")), 80);
    if (!slug) continue;
    const mountBase = fitSlug(slugify(String(raw?.place || "main")), 32) || "main";
    let mount = mountBase;
    let n = 2;
    while (used.has(`${slug}|${mount}`)) {
      mount = `${mountBase}-${n}`.slice(0, 48);
      n += 1;
    }
    used.add(`${slug}|${mount}`);
    const caliberMm = dec(raw.calibre, 2, 9999.99);
    out.push({
      slug,
      name: String(raw.name || raw.id).replace(/\s+/g, " ").trim().slice(0, 200),
      caliberMm,
      rateOfFireRpm: dec(raw.rpm, 2, 99999.99),
      reloadS: dec(raw.reload, 2, 999.99),
      maxRangeM: whole(raw.range),
      mount,
      quantity: 1,
      ammo: buildAmmo(slug, raw.ammo, caliberMm),
      ap: raw.ap ?? null,
      calibre: finite(raw.calibre),
    });
  }
  return out;
}

function bestWeapon(weapons) {
  let best = null;
  let bestCal = -1;
  for (const weapon of weapons) {
    const cal = Number.isFinite(weapon.calibre) ? weapon.calibre : -1;
    const hasAp = weapon.ap && (weapon.ap.pointBlank != null || weapon.ap.at100 != null);
    const bestAp = best?.ap && (best.ap.pointBlank != null || best.ap.at100 != null);
    if (!best || cal > bestCal || (cal === bestCal && hasAp && !bestAp)) {
      best = weapon;
      bestCal = cal;
    }
  }
  return best;
}

function primaryOf(weapons) {
  const mounted = weapons.filter(
    (weapon) => weapon.mount === "gun" || weapon.mount.startsWith("gun-"),
  );
  return bestWeapon(mounted.length ? mounted : weapons);
}

function rawMount(weapon) {
  return fitSlug(slugify(String(weapon?.place || "main")), 32) || "main";
}

function bestRawWeapon(weapons) {
  let best = null;
  let bestCal = -1;
  for (const weapon of weapons) {
    const cal = finite(weapon?.calibre);
    const calN = cal == null ? -1 : cal;
    const ap = weapon?.ap;
    const hasAp = ap && typeof ap === "object" && (ap.pointBlank != null || ap.at100 != null);
    const bestAp =
      best?.ap &&
      typeof best.ap === "object" &&
      (best.ap.pointBlank != null || best.ap.at100 != null);
    if (!best || calN > bestCal || (calN === bestCal && hasAp && !bestAp)) {
      best = weapon;
      bestCal = calN;
    }
  }
  return best;
}

export function primaryRawWeapon(unit) {
  const list = Array.isArray(unit?.weapons) ? unit.weapons : [];
  const usable = list.filter(
    (weapon) => weapon && typeof weapon === "object" && fitSlug(slugify(String(weapon.id || "")), 80),
  );
  const mounted = usable.filter((weapon) => {
    const mount = rawMount(weapon);
    return mount === "gun" || mount.startsWith("gun-");
  });
  return bestRawWeapon(mounted.length ? mounted : usable);
}

export function hullFrontPlate(unit) {
  const armor = unit?.vehicle?.armor;
  const list = Array.isArray(armor) ? armor : [];
  const hull = list.filter(
    (plate) =>
      plate &&
      typeof plate === "object" &&
      !/turret|gun/i.test(String(plate.volume || "")),
  );
  const body = hull.length ? hull : list.filter((plate) => plate && typeof plate === "object");
  let best = null;
  let bestN = null;
  for (const plate of body) {
    const n = small(plate.front);
    if (n == null) continue;
    if (bestN == null || n > bestN) {
      best = plate;
      bestN = n;
    }
  }
  return best;
}

function headcount(members) {
  if (!Array.isArray(members) || members.length === 0) return null;
  let n = 0;
  for (const member of members) n += Number(member?.count) || 0;
  return small(n);
}

function roleLabel(breed) {
  const parts = String(breed || "")
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return parts
    .map((part) => {
      if (/^\d/.test(part)) return part;
      if (part.length <= 2) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ")
    .slice(0, 40);
}

function combatWeapon(weapon) {
  if (!weapon) return null;
  const caliberMm = dec(weapon.calibre, 2, 9999.99);
  const rpm = dec(weapon.rpm, 2, 99999.99);
  const rangeM = whole(weapon.range);
  if (caliberMm == null && rpm == null && rangeM == null) return null;
  const name = String(weapon.name || weapon.id || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!name) return null;
  return { weapon: name, caliberMm, rpm, rangeM };
}

function rosterOf(unit) {
  const members = Array.isArray(unit.members) ? unit.members : [];
  const byId = new Map();
  for (const weapon of Array.isArray(unit.weapons) ? unit.weapons : []) {
    const id = String(weapon?.id || "").trim();
    if (id && !byId.has(id)) byId.set(id, weapon);
  }
  const rows = [];
  for (const member of members) {
    const count = small(member?.count);
    const role = roleLabel(member?.breed);
    if (!count || !role) continue;
    let picked = null;
    for (const item of Array.isArray(member.items) ? member.items : []) {
      picked = combatWeapon(byId.get(String(item?.id || "").trim()));
      if (picked) break;
    }
    if (!picked) continue;
    rows.push({ role, count, ...picked });
    if (rows.length >= 24) break;
  }
  return rows;
}

function extraOf(unit) {
  const extra = {};
  if (unit.id) extra.gameId = String(unit.id).slice(0, 200);
  if (unit.roster) extra.roster = String(unit.roster).slice(0, 40);
  if (unit.period) extra.period = String(unit.period).slice(0, 40);
  const minStage = small(unit.minStage);
  const maxStage = small(unit.maxStage);
  if (minStage != null) extra.minStage = minStage;
  if (maxStage != null) extra.maxStage = maxStage;
  const members = rosterOf(unit);
  if (members.length) extra.members = members;
  return Object.keys(extra).length ? extra : null;
}

export function researchSlug(id) {
  return fitSlug(slugify(String(id || "")), 80);
}

function stubName(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 300);
}

function fillResearchStubs(research, records) {
  const missing = [];
  const seen = new Set();
  for (const node of research.values()) {
    for (const req of node.requires) {
      const key = `${node.factionSlug}|${req}`;
      if (research.has(key) || seen.has(key)) continue;
      seen.add(key);
      missing.push({ factionSlug: node.factionSlug, slug: req });
    }
  }
  for (const stub of missing) {
    const side = FACTION_SIDE[stub.factionSlug];
    const matches = records.filter((record) => {
      if (record.factionSlug !== stub.factionSlug) return false;
      const id = record.shortName || "";
      if (!id) return false;
      if (side && researchSlug(`${id}(${side})`) === stub.slug) return true;
      return researchSlug(id) === stub.slug;
    });
    const first = matches[0];
    const roster = first?.stats?.extra?.roster;
    research.set(`${stub.factionSlug}|${stub.slug}`, {
      factionSlug: stub.factionSlug,
      slug: stub.slug,
      name: first?.name || stubName(stub.slug),
      branch: String(roster || "general").slice(0, 80),
      researchCost: null,
      requires: [],
      unitSlugs: matches.map((record) => record.slug),
    });
  }
}

function rememberResearch(research, record, unit) {
  const raw = unit.research;
  if (!raw?.id) return null;
  const slug = researchSlug(raw.id);
  if (!slug) return null;
  const requires = [];
  const seen = new Set();
  for (const req of raw.requires || []) {
    const next = researchSlug(req);
    if (!next || next === slug || seen.has(next)) continue;
    seen.add(next);
    requires.push(next);
  }
  const key = `${record.factionSlug}|${slug}`;
  let node = research.get(key);
  if (!node) {
    node = {
      factionSlug: record.factionSlug,
      slug,
      name: record.name,
      branch: String(unit.roster || "general").slice(0, 80),
      researchCost: costAmount(raw.costs),
      requires,
      unitSlugs: [],
    };
    research.set(key, node);
  }
  node.unitSlugs.push(record.slug);
  return { slug, requires: node.requires };
}

function blankStats(extra) {
  return {
    hp: null,
    armorFrontMm: null,
    armorSideMm: null,
    armorRearMm: null,
    armorTopMm: null,
    turretFrontMm: null,
    turretSideMm: null,
    turretRearMm: null,
    speedRoadKmh: null,
    speedOffroadKmh: null,
    reverseSpeedKmh: null,
    turretTraverseDegS: null,
    hullTraverseDegS: null,
    reloadS: null,
    visionRangeM: null,
    startingVeterancy: null,
    weightT: null,
    fuelL: null,
    penetrationMm: null,
    caliberMm: null,
    rangeM: null,
    hpPerSoldier: null,
    rifles: null,
    semiAuto: null,
    smgs: null,
    mgs: null,
    atWeapons: null,
    sniperRifles: null,
    extra,
  };
}

function mapUnit(unit, taken, research) {
  const id = String(unit?.id || "").trim();
  if (!id) return { id: "", reason: "id" };
  const factionSlug = SIDES[String(unit.side || "").toLowerCase()] ?? null;
  if (!factionSlug) return { id, reason: "side" };
  const base = fitSlug(
    slugify([unit.roster, unit.side, unit.period, id].filter(Boolean).join("-")),
    80,
  );
  const slug = base ? claimSlug(base, taken, 80) : null;
  if (!slug) return { id, reason: "slug" };

  const name = String(unit.name || id)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  const mappedWeapons = mapWeapons(unit.weapons);
  const primary = primaryOf(mappedWeapons);
  const weapons = mappedWeapons.map((weapon) => ({
    slug: weapon.slug,
    name: weapon.name,
    caliberMm: weapon.caliberMm,
    rateOfFireRpm: weapon.rateOfFireRpm,
    reloadS: weapon.reloadS,
    maxRangeM: weapon.maxRangeM,
    mount: weapon.mount,
    quantity: weapon.quantity,
    ammo: weapon.ammo,
  }));
  const mobility = unit.vehicle?.mobility ?? null;
  const heads = headcount(unit.members);
  const costs = [];
  const cp = costAmount(unit.cp);
  const resources = costAmount(unit.cost);
  if (cp != null) costs.push({ kind: "cp", amount: cp });
  if (resources != null) costs.push({ kind: "resources", amount: resources });
  const apPen = primary
    ? (dec(primary.ap?.pointBlank, 1, 99999.9) ?? dec(primary.ap?.at100, 1, 99999.9))
    : null;
  const armor = armorOf(unit.vehicle?.armor);
  const stats = {
    ...blankStats(extraOf(unit)),
    ...armor,
    speedRoadKmh: dec(mobility?.speed, 1, 999.9),
    reverseSpeedKmh: dec(mobility?.reverse, 1, 999.9),
    hullTraverseDegS: dec(mobility?.traverse, 1, 999.9),
    reloadS: primary?.reloadS ?? null,
    weightT: dec(mobility?.weight, 2, 9999.99),
    fuelL: small(mobility?.fuel),
    penetrationMm: apPen,
    caliberMm: primary?.caliberMm ?? null,
    rangeM: primary?.maxRangeM ?? null,
  };
  const record = {
    slug,
    name,
    shortName: id.slice(0, 80),
    searchName: searchFold(name).slice(0, 300) || slug,
    factionSlug,
    typeCode: unitTypeCode(unit),
    crewSize: unit.vehicle ? heads : null,
    squadSize: heads,
    tier: null,
    notes: null,
    costs,
    specialties: [],
    weapons,
    stats,
  };
  record.research = rememberResearch(research, record, unit);
  return { record };
}

const ROSTER_RANK = { conquest: 0, late: 1, mid: 2, early: 3 };
const PERIOD_RANK = { late: 0, mid: 1, early: 2 };

function variantScore(unit) {
  const roster = ROSTER_RANK[String(unit?.roster || "")] ?? 9;
  const research = unit?.research?.id ? 0 : 1;
  const period = PERIOD_RANK[String(unit?.period || "")] ?? 9;
  return roster * 100 + research * 10 + period;
}

function keptIndexes(units) {
  const best = new Map();
  const keep = new Set();
  units.forEach((unit, index) => {
    const id = String(unit?.id || "").trim();
    const faction = SIDES[String(unit?.side || "").toLowerCase()];
    if (!id || !faction) {
      keep.add(index);
      return;
    }
    const key = `${faction}|${id}`;
    const score = variantScore(unit);
    const prev = best.get(key);
    if (!prev || score < prev.score || (score === prev.score && index < prev.index)) {
      if (prev) keep.delete(prev.index);
      best.set(key, { index, score });
      keep.add(index);
    }
  });
  return keep;
}

export function mapSnapshot(doc) {
  const units = Array.isArray(doc?.units) ? doc.units : [];
  const keep = keptIndexes(units);
  const taken = new Set();
  const records = [];
  const skipped = [];
  const research = new Map();
  for (let index = 0; index < units.length; index++) {
    if (!keep.has(index)) continue;
    const result = mapUnit(units[index], taken, research);
    if (result.record) {
      result.record.sourceIndex = index;
      records.push(result.record);
    } else skipped.push({ id: result.id, reason: result.reason });
  }
  fillResearchStubs(research, records);
  return { records, skipped, research: [...research.values()] };
}

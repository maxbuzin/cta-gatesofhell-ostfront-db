export const SPREADSHEET_ID = "1elHuL52C8EJvYa4Zaxo4yUu0DyCjK2RK0Q8Z70Th0fc";

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

export const TABS = [
  {
    title: "Infantry",
    gid: 1722951886,
    code: "infantry_squad",
    category: "infantry",
    nameEn: "Infantry",
  },
  {
    title: "Tanks",
    gid: 1988375792,
    code: "tank",
    category: "vehicle",
    nameEn: "Tanks",
  },
  {
    title: "Tank Destroyers & SPG",
    gid: 776364042,
    code: "tank_destroyer",
    category: "vehicle",
    nameEn: "Tank Destroyers & SPG",
  },
  {
    title: "Armored Cars & Light Vehicles",
    gid: 164981896,
    code: "armored_car",
    category: "vehicle",
    nameEn: "Armored Cars & Light Vehicles",
  },
  {
    title: "Support Vehicles & Trucks",
    gid: 17044425,
    code: "support_vehicle",
    category: "vehicle",
    nameEn: "Support Vehicles & Trucks",
  },
  {
    title: "AT Guns",
    gid: 2057833379,
    code: "at_gun",
    category: "gun",
    nameEn: "AT Guns",
  },
  {
    title: "AA Guns",
    gid: 850295062,
    code: "aa_gun",
    category: "gun",
    nameEn: "AA Guns",
  },
  {
    title: "Artillery",
    gid: 1892909551,
    code: "artillery",
    category: "gun",
    nameEn: "Artillery",
  },
  {
    title: "Mortars & Rockets",
    gid: 1827094135,
    code: "mortar",
    category: "gun",
    nameEn: "Mortars & Rockets",
  },
  {
    title: "MG Emplacements",
    gid: 45706019,
    code: "mg_emplacement",
    category: "emplacement",
    nameEn: "MG Emplacements",
  },
];

export const FACTION_SEED = [
  { slug: "germany", nameEn: "Germany", color: "#5E6B73", sortOrder: 1 },
  { slug: "ussr", nameEn: "USSR", color: "#B23A2F", sortOrder: 2 },
  { slug: "usa", nameEn: "USA", color: "#4A6B3A", sortOrder: 3 },
  { slug: "british", nameEn: "British Commonwealth", color: "#A8834A", sortOrder: 4 },
  { slug: "finland", nameEn: "Finland", color: "#3E6FA8", sortOrder: 5 },
  { slug: "japan", nameEn: "Japan", color: "#C9C2B0", sortOrder: 6 },
];

const FACTION_ALIASES = new Map([
  ["germany", "germany"],
  ["german", "germany"],
  ["wehrmacht", "germany"],
  ["ussr", "ussr"],
  ["soviet", "ussr"],
  ["soviet union", "ussr"],
  ["soviets", "ussr"],
  ["russia", "ussr"],
  ["usa", "usa"],
  ["us", "usa"],
  ["united states", "usa"],
  ["america", "usa"],
  ["british", "british"],
  ["britain", "british"],
  ["uk", "british"],
  ["british commonwealth", "british"],
  ["commonwealth", "british"],
  ["finland", "finland"],
  ["finnish", "finland"],
  ["japan", "japan"],
  ["japanese", "japan"],
]);

const HEADER_TO_FIELD = new Map(
  [
    ["unit", ["unit"]],
    ["faction", ["faction"]],
    ["specialty", ["main specialty"]],
    ["cp", ["helmet (cp - deploy points)"]],
    ["resources", ["shield (cost - resources)"]],
    ["tier", ["tier"]],
    ["veterancy", ["starting veterancy"]],
    ["hpPerSoldier", ["health per soldier (hp)"]],
    ["squadSize", ["squad size"]],
    ["rifles", ["rifles (bolt)"]],
    ["semiAuto", ["semi-auto rifles"]],
    ["smgs", ["smgs"]],
    ["mgs", ["mgs"]],
    ["atWeapons", ["at weapons"]],
    ["sniperRifles", ["sniper rifles"]],
    ["vision", ["line of sight (m)", "max field of view (m)"]],
    ["speed", ["speed (km/h)"]],
    ["reload", ["reload (s)"]],
    ["turretArmor", ["turret armor max (mm)"]],
    ["hullArmor", ["hull armor max (mm)"]],
    ["penAp", ["pen ap point-blank (mm)"]],
    ["penApcr", ["pen apcr/hvap point-blank (mm)"]],
    ["penHeat", ["heat pen (mm)"]],
    ["calibre", ["calibre (mm)", "caliber (mm)"]],
    ["rangeAp", ["range ap (m)"]],
    ["rangeHe", ["range he (m)"]],
    ["range", ["range (m)"]],
    ["maxRange", ["max range (m)"]],
    ["minRange", ["min range (m)"]],
    ["penAp100", ["pen ap @100m (mm)"]],
    ["extraArmor", ["extra armor max (mm)"]],
    ["mainGun", ["main gun"]],
    ["weapon", ["weapon"]],
    ["mainWeapons", ["main weapons"]],
    ["ammo", ["ammo types"]],
    ["crew", ["crew"]],
    ["maxOccupants", ["max occupants"]],
    ["mgPen", ["mg pen closest (mm)"]],
    ["mgPen100", ["mg pen @100m (mm)"]],
    ["rof", ["rate of fire (rpm)"]],
    ["fuel", ["fuel tank (l)"]],
    ["supply", ["supply"]],
    ["dispersion", ["lateral dispersion @max (m)"]],
    ["volley", ["volley size"]],
    ["className", ["class"]],
    ["sheetType", ["type"]],
    ["grenadesMin", ["grenades (min)"]],
    ["grenadesMax", ["grenades (max)"]],
    ["atGrenadesMin", ["at grenades / charges / mines (min)"]],
    ["atGrenadesMax", ["at grenades / charges / mines (max)"]],
    ["molotovsMin", ["molotovs (min)"]],
    ["molotovsMax", ["molotovs (max)"]],
    ["stamina", ["stamina"]],
    ["era", ["era"]],
    ["doctrine", ["doctrine / section"]],
    ["shovel", ["has shovel"]],
    ["binoculars", ["has binoculars"]],
  ].flatMap(([field, keys]) => keys.map((key) => [key, field])),
);

const AMMO_KIND = {
  AP: "AP",
  APHE: "APHE",
  APCR: "APCR",
  HVAP: "APCR",
  APDS: "APDS",
  HEAT: "HEAT",
  HE: "HE",
  HESH: "HESH",
  SMOKE: "Smoke",
  SHRAPNEL: "Shrapnel",
  BALL: "Ball",
  TRACER: "Tracer",
  APC: "Other",
  "APC-HE": "APHE",
  APCHE: "APHE",
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const UNIT_SLUG_MAX = 64;

export function headerKey(header) {
  return String(header)
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function indexHeaders(headers) {
  const index = new Map();
  headers.forEach((header, i) => {
    const key = headerKey(header);
    if (!key) return;
    if (key === "source") {
      if (!index.has("rowSource")) index.set("rowSource", i);
      return;
    }
    if (key.startsWith("notes")) {
      if (!index.has("notes")) index.set("notes", i);
      return;
    }
    const field = HEADER_TO_FIELD.get(key);
    if (field && !index.has(field)) index.set(field, i);
  });
  return index;
}

export function searchFold(name) {
  return String(name)
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input) {
  return searchFold(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fitSlug(raw, max = 80) {
  const cap = Math.min(80, max);
  let s = String(raw).toLowerCase().slice(0, cap).replace(/^-+|-+$/g, "");
  if (!/^[a-z0-9]/.test(s)) return null;
  s = s.slice(0, cap).replace(/-+$/g, "");
  if (!s || !SLUG_RE.test(s) || s.length > cap) return null;
  return s;
}

export function claimSlug(base, taken, max = 80) {
  const fitted = fitSlug(base, max);
  if (!fitted) return null;
  if (!taken.has(fitted)) {
    taken.add(fitted);
    return fitted;
  }
  for (let n = 2; n < 10000; n++) {
    const suffix = `-${n}`;
    const stem = fitSlug(fitted, max - suffix.length);
    if (!stem) continue;
    const candidate = `${stem}${suffix}`;
    if (
      candidate.length <= max &&
      SLUG_RE.test(candidate) &&
      !taken.has(candidate)
    ) {
      taken.add(candidate);
      return candidate;
    }
  }
  return null;
}

export function unitSlug(factionSlug, name, taken) {
  const base = fitSlug(slugify(`${factionSlug}-${name}`), UNIT_SLUG_MAX);
  if (!base) return null;
  return claimSlug(base, taken, UNIT_SLUG_MAX);
}

export function childSlug(unitSlugValue, tail) {
  const cleanTail = fitSlug(tail, 14);
  if (!cleanTail) return null;
  return fitSlug(`${unitSlugValue}--${cleanTail}`, 80);
}

export function mapFaction(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  return FACTION_ALIASES.get(key) ?? FACTION_ALIASES.get(slugify(key)) ?? null;
}

export function ammoKind(label) {
  const compact = String(label).trim().toUpperCase().replace(/[\s_]+/g, "");
  if (AMMO_KIND[compact]) return AMMO_KIND[compact];
  if (compact.includes("APCR") || compact.includes("HVAP")) return "APCR";
  if (compact.includes("HEAT")) return "HEAT";
  if (compact.includes("APCHE")) return "APHE";
  return "Other";
}

export function shortNameOf(name) {
  const matches = [...String(name).matchAll(/\(([^)]+)\)/g)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const token = matches[i][1].trim();
    if (/^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+$/.test(token)) return token.slice(0, 80);
  }
  const whole = String(name).trim();
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(whole)) return whole.slice(0, 80);
  return null;
}

export function parseNum(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s || s === "-" || s === "--" || s === "?" || /^n\/?a$/i.test(s)) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseIntIn(raw, { min = 0, max = 32767 } = {}) {
  const n = parseNum(raw);
  if (n == null) return null;
  const i = Math.round(n);
  if (i < min || i > max) return null;
  return i;
}

export function parseDecimal(raw, { min = 0, max = 9999, digits = 1 } = {}) {
  const n = parseNum(raw);
  if (n == null || n < min || n > max) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

export function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => String(value).trim()));
}

function cell(index, cells, field) {
  const at = index.get(field);
  if (at == null) return "";
  return String(cells[at] ?? "").trim();
}

function splitSpecialties(raw) {
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const part of raw.split("/")) {
    const nameEn = part.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!nameEn) continue;
    const slug = fitSlug(slugify(nameEn));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, nameEn });
  }
  return out;
}

function ammoTail(label, kind) {
  const compact = String(label).trim().toUpperCase().replace(/[\s_]+/g, "");
  if (compact === "AP" || (kind === "AP" && compact === "AP")) return "ap";
  if (kind === "APCR") return "apcr";
  if (kind === "HEAT") return "heat";
  if (compact === "HE") return "he";
  if (compact === "APHE" || compact === "APC-HE" || compact === "APCHE") return "aphe";
  if (compact === "MG") return "mg";
  if (kind === "AP") return "ap";
  return fitSlug(slugify(label), 14) || "ammo";
}

function penPoints(zero, hundred) {
  const points = [];
  if (zero != null) points.push({ rangeM: 0, mm: zero });
  if (hundred != null) points.push({ rangeM: 100, mm: hundred });
  return points;
}

function buildAmmo(unitSlugValue, rawAmmo, pens) {
  const entries = [];
  for (const label of String(rawAmmo)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const kind = ammoKind(label);
    entries.push({ label, kind, tail: ammoTail(label, kind) });
  }
  const ensure = (label, kind, tail) => {
    if (!entries.some((entry) => entry.tail === tail)) {
      entries.push({ label, kind, tail });
    }
  };
  if (pens.ap0 != null || pens.ap100 != null) ensure("AP", "AP", "ap");
  if (pens.apcr0 != null) ensure("APCR", "APCR", "apcr");
  if (pens.heat0 != null) ensure("HEAT", "HEAT", "heat");
  if (pens.mg0 != null || pens.mg100 != null) ensure("MG", "Other", "mg");

  const taken = new Set();
  const penUsed = new Set();
  let defaultSet = false;
  const prefer = entries.some((entry) => entry.tail === "ap") ? "ap" : entries[0]?.tail;
  return entries.flatMap((entry) => {
    const base = childSlug(unitSlugValue, entry.tail);
    const slug = base ? claimSlug(base, taken, 80) : null;
    if (!slug) return [];
    let pen = [];
    if (!penUsed.has(entry.tail)) {
      penUsed.add(entry.tail);
      if (entry.tail === "ap") pen = penPoints(pens.ap0, pens.ap100);
      else if (entry.tail === "apcr") pen = penPoints(pens.apcr0, null);
      else if (entry.tail === "heat") pen = penPoints(pens.heat0, null);
      else if (entry.tail === "mg") pen = penPoints(pens.mg0, pens.mg100);
    }
    const isDefault = !defaultSet && entry.tail === prefer;
    if (isDefault) defaultSet = true;
    return [
      {
        slug,
        name: entry.label.slice(0, 120),
        kind: entry.kind,
        caliberMm: entry.tail === "mg" ? null : pens.caliberMm,
        isDefault,
        pen,
      },
    ];
  });
}

function extraFrom(fields) {
  const extra = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === "") continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) extra[key] = value;
      continue;
    }
    extra[key] = String(value).slice(0, 2000);
  }
  return Object.keys(extra).length ? extra : null;
}

export function mapRow(headers, cells, tab, taken, sheetRow = 0) {
  const index = indexHeaders(headers);
  const read = (field) => cell(index, cells, field);
  const name = read("unit").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!name) return { skip: "empty" };
  const factionRaw = read("faction");
  const factionSlug = mapFaction(factionRaw);
  if (!factionSlug) return { skip: "faction", name, faction: factionRaw };
  const slug = unitSlug(factionSlug, name, taken);
  if (!slug) return { skip: "slug", name, faction: factionRaw };

  const cp = parseIntIn(read("cp"), { min: 0, max: 2_000_000_000 });
  const resources = parseIntIn(read("resources"), { min: 0, max: 2_000_000_000 });
  const costs = [];
  if (cp != null) costs.push({ kind: "cp", amount: cp });
  if (resources != null) costs.push({ kind: "resources", amount: resources });

  const small = (field) => parseIntIn(read(field), { min: 0, max: 32767 });
  const wideInt = (field, max = 1_000_000) => parseIntIn(read(field), { min: 0, max });
  const speed = parseDecimal(read("speed"), { min: 0, max: 999.9, digits: 1 });
  const reloadS = parseDecimal(read("reload"), { min: 0, max: 999.99, digits: 2 });
  const caliberMm = parseDecimal(read("calibre"), { min: 0, max: 9999.99, digits: 2 });
  const penAp = parseDecimal(read("penAp"), { min: 0, max: 99999.9, digits: 1 });
  const penAp100 = parseDecimal(read("penAp100"), { min: 0, max: 99999.9, digits: 1 });
  const penApcr = parseDecimal(read("penApcr"), { min: 0, max: 99999.9, digits: 1 });
  const penHeat = parseDecimal(read("penHeat"), { min: 0, max: 99999.9, digits: 1 });
  const mgPen = parseDecimal(read("mgPen"), { min: 0, max: 99999.9, digits: 1 });
  const mgPen100 = parseDecimal(read("mgPen100"), { min: 0, max: 99999.9, digits: 1 });
  const rangeAp = wideInt("rangeAp");
  const rangeHe = wideInt("rangeHe");
  const range = wideInt("range");
  const maxRange = wideInt("maxRange");
  const minRange = wideInt("minRange");
  const rangeM = rangeAp ?? range ?? maxRange;
  const rangeCandidates = [rangeAp, rangeHe, range, maxRange].filter((n) => n != null);
  const rof = parseDecimal(read("rof"), { min: 0, max: 99999.99, digits: 2 });
  const ammo = buildAmmo(slug, read("ammo"), {
    ap0: penAp,
    ap100: penAp100,
    apcr0: penApcr,
    heat0: penHeat,
    mg0: mgPen,
    mg100: mgPen100,
    caliberMm,
  });
  const gunName = read("mainGun") || read("weapon");
  const weapon =
    gunName || ammo.length || rof != null
      ? {
          slug: childSlug(slug, "gun"),
          name: (gunName || name).slice(0, 200),
          caliberMm,
          rateOfFireRpm: rof,
          reloadS,
          maxRangeM: rangeCandidates.length ? Math.max(...rangeCandidates) : null,
        }
      : null;

  const notesRaw = read("notes");
  return {
    record: {
      slug,
      name,
      shortName: shortNameOf(name),
      searchName: searchFold(name).slice(0, 300) || slug,
      factionSlug,
      typeCode: tab.code,
      crewSize: small("crew"),
      squadSize: small("squadSize"),
      tier: small("tier"),
      notes: notesRaw ? notesRaw.slice(0, 8000) : null,
      costs,
      specialties: splitSpecialties(read("specialty")),
      weapon: weapon?.slug ? weapon : null,
      ammo: weapon?.slug ? ammo : [],
      stats: {
        hp: null,
        armorFrontMm: small("hullArmor"),
        armorSideMm: null,
        armorRearMm: null,
        armorTopMm: null,
        turretFrontMm: small("turretArmor"),
        turretSideMm: null,
        turretRearMm: null,
        speedRoadKmh: speed,
        speedOffroadKmh: null,
        reverseSpeedKmh: null,
        turretTraverseDegS: null,
        hullTraverseDegS: null,
        reloadS,
        visionRangeM: small("vision"),
        startingVeterancy: small("veterancy"),
        weightT: null,
        fuelL: small("fuel"),
        penetrationMm: penAp ?? mgPen ?? penHeat,
        caliberMm,
        rangeM,
        hpPerSoldier: wideInt("hpPerSoldier"),
        rifles: small("rifles"),
        semiAuto: small("semiAuto"),
        smgs: small("smgs"),
        mgs: small("mgs"),
        atWeapons: small("atWeapons"),
        sniperRifles: small("sniperRifles"),
        extra: extraFrom({
          sheetRow,
          className: read("className"),
          sheetType: read("sheetType"),
          supply: read("supply"),
          extraArmorMm: parseDecimal(read("extraArmor"), {
            min: 0,
            max: 99999.9,
            digits: 1,
          }),
          maxOccupants: small("maxOccupants"),
          dispersionM: parseDecimal(read("dispersion"), {
            min: 0,
            max: 99999.9,
            digits: 1,
          }),
          volleySize: small("volley"),
          rangeHeM: rangeHe,
          minRangeM: minRange,
          sourceNote: read("rowSource"),
          mainWeapons: read("mainWeapons"),
          grenadesMin: parseIntIn(read("grenadesMin"), { min: 0, max: 9999 }),
          grenadesMax: parseIntIn(read("grenadesMax"), { min: 0, max: 9999 }),
          atGrenadesMin: parseIntIn(read("atGrenadesMin"), { min: 0, max: 9999 }),
          atGrenadesMax: parseIntIn(read("atGrenadesMax"), { min: 0, max: 9999 }),
          molotovsMin: parseIntIn(read("molotovsMin"), { min: 0, max: 9999 }),
          molotovsMax: parseIntIn(read("molotovsMax"), { min: 0, max: 9999 }),
          stamina: read("stamina"),
          era: read("era"),
          doctrine: read("doctrine"),
          hasShovel: read("shovel"),
          hasBinoculars: read("binoculars"),
        }),
      },
    },
  };
}

export function mapSheet(tab, csvText, taken) {
  const table = parseCsv(csvText);
  if (!table.length) return { records: [], skipped: [] };
  const headers = table[0];
  const index = indexHeaders(headers);
  if (!index.has("unit") || !index.has("faction")) {
    throw new Error(`Tab ${tab.title} is missing Unit or Faction`);
  }
  const records = [];
  const skipped = [];
  for (let r = 1; r < table.length; r++) {
    const result = mapRow(headers, table[r], tab, taken, r + 1);
    if (result.record) records.push(result.record);
    else if (result.skip !== "empty") skipped.push(result);
  }
  return { records, skipped };
}

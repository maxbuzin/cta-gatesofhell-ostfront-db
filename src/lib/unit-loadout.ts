export const AMMO_KINDS = [
  "AP",
  "APHE",
  "APCR",
  "APDS",
  "HEAT",
  "HE",
  "HESH",
  "Smoke",
  "Shrapnel",
  "Ball",
  "Tracer",
  "Other",
] as const;

export const TYPE_CATEGORIES = ["infantry", "vehicle", "gun", "emplacement"] as const;

export const CATEGORY_LABEL: Record<(typeof TYPE_CATEGORIES)[number], string> = {
  infantry: "Infantry",
  vehicle: "Vehicle",
  gun: "Gun",
  emplacement: "Emplacement",
};

export type AmmoKind = (typeof AMMO_KINDS)[number];
export type TypeCategory = (typeof TYPE_CATEGORIES)[number];

export type TypeOption = {
  code: string;
  name: string;
  category: TypeCategory;
};

export type TypeChoice = {
  code: string | null;
  name: string;
  category: TypeCategory;
  fresh: boolean;
};

export type AmmoDraft = {
  kind: AmmoKind;
  points: { rangeM: string; mm: string }[];
};

export type LoadoutAmmo = {
  kind: AmmoKind;
  points: { rangeM: number; mm: number }[];
};

export type UnitLoadout = {
  typeCode: string | null;
  typeName: string | null;
  typeCategory: TypeCategory | null;
  ammo: LoadoutAmmo[];
};

const CODE = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const KINDS = new Set<string>(AMMO_KINDS);
const CATEGORIES = new Set<string>(TYPE_CATEGORIES);

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function isAmmoKind(value: string): value is AmmoKind {
  return KINDS.has(value);
}

export function isTypeCategory(value: string): value is TypeCategory {
  return CATEGORIES.has(value);
}

function cleanTypeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function rangeM(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100_000) return null;
  return value;
}

function mm(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 99999.9) return null;
  return Math.round(value * 10) / 10;
}

export function parseLoadout(body: {
  typeCode?: unknown;
  typeName?: unknown;
  typeCategory?: unknown;
  ammo?: unknown;
}): Parsed<UnitLoadout> {
  let typeCode: string | null = null;
  if (typeof body.typeCode === "string" && body.typeCode) {
    if (!CODE.test(body.typeCode)) return { ok: false, error: "Invalid type" };
    typeCode = body.typeCode;
  } else if (body.typeCode != null && body.typeCode !== "") {
    return { ok: false, error: "Invalid type" };
  }
  let typeName: string | null = null;
  if (typeof body.typeName === "string") typeName = cleanTypeName(body.typeName) || null;
  else if (body.typeName != null && body.typeName !== "") return { ok: false, error: "Invalid type" };
  let typeCategory: TypeCategory | null = null;
  if (typeof body.typeCategory === "string" && body.typeCategory) {
    if (!isTypeCategory(body.typeCategory)) return { ok: false, error: "Invalid type" };
    typeCategory = body.typeCategory;
  } else if (body.typeCategory != null && body.typeCategory !== "") {
    return { ok: false, error: "Invalid type" };
  }
  if (typeCode == null && !typeName) return { ok: false, error: "Type is required" };
  if (typeCode == null && typeCategory == null) return { ok: false, error: "Type is required" };
  if (!Array.isArray(body.ammo) || body.ammo.length > AMMO_KINDS.length) {
    return { ok: false, error: "Invalid ammo" };
  }
  const ammo: LoadoutAmmo[] = [];
  const seen = new Set<string>();
  for (const item of body.ammo) {
    if (!item || typeof item !== "object") return { ok: false, error: "Invalid ammo" };
    const row = item as { kind?: unknown; points?: unknown };
    if (typeof row.kind !== "string" || !isAmmoKind(row.kind)) return { ok: false, error: "Invalid ammo" };
    if (seen.has(row.kind)) return { ok: false, error: "Duplicate ammo" };
    seen.add(row.kind);
    if (!Array.isArray(row.points) || row.points.length === 0 || row.points.length > 24) {
      return { ok: false, error: "Add a distance" };
    }
    const points: { rangeM: number; mm: number }[] = [];
    const ranges = new Set<number>();
    for (const point of row.points) {
      if (!point || typeof point !== "object") return { ok: false, error: "Invalid distance" };
      const cell = point as { rangeM?: unknown; mm?: unknown };
      const range = rangeM(cell.rangeM);
      const pen = mm(cell.mm);
      if (range == null) return { ok: false, error: "Invalid distance" };
      if (pen == null) return { ok: false, error: "Invalid penetration" };
      if (ranges.has(range)) return { ok: false, error: "Duplicate distance" };
      ranges.add(range);
      points.push({ rangeM: range, mm: pen });
    }
    ammo.push({ kind: row.kind, points });
  }
  return {
    ok: true,
    value: {
      typeCode,
      typeName: typeCode ? null : typeName,
      typeCategory: typeCode ? null : typeCategory,
      ammo,
    },
  };
}

export function readUnitLoadout(type: TypeChoice, ammo: AmmoDraft[]) {
  return parseLoadout({
    typeCode: type.fresh ? null : type.code,
    typeName: type.fresh ? type.name : null,
    typeCategory: type.fresh ? type.category : null,
    ammo: ammo.map((row) => ({
      kind: row.kind,
      points: row.points.map((point) => ({
        rangeM: point.rangeM.trim() === "" ? null : Number(point.rangeM),
        mm: point.mm.trim() === "" ? null : Number(point.mm),
      })),
    })),
  });
}

export function ammoDraftFrom(
  series: { kind: string; points: { rangeM: number; mm: number }[] }[],
): AmmoDraft[] {
  const map = new Map<AmmoKind, AmmoDraft>();
  for (const row of series) {
    const kind = isAmmoKind(row.kind) ? row.kind : "Other";
    let draft = map.get(kind);
    if (!draft) {
      draft = { kind, points: [] };
      map.set(kind, draft);
    }
    for (const point of row.points) {
      const rangeM = String(point.rangeM);
      if (draft.points.some((item) => item.rangeM === rangeM)) continue;
      draft.points.push({ rangeM, mm: String(point.mm) });
    }
  }
  return [...map.values()];
}

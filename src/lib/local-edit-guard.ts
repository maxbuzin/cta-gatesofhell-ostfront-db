import { renameSync, writeFileSync } from "node:fs";

import {
  factionSlugOf,
  hullFrontPlate,
  primaryRawWeapon,
  researchSlug,
} from "../../etl/snapshot-map.mjs";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type UnitEdit = {
  kind: "unit";
  slug: string;
  unit: Record<string, unknown>;
};

export type ResearchEdit = {
  kind: "research";
  factionSlug: string;
  nodeSlug: string;
  costs: number | null;
  requires: string[];
};

export const STAT_FIELDS = ["name", "cp", "cost", "speed", "reload", "penetration", "armor"] as const;

export type StatField = (typeof STAT_FIELDS)[number];

export type StatEdit = {
  kind: "stat";
  slug: string;
  field: StatField;
  value: string | number | null;
};

export type EditBody = UnitEdit | ResearchEdit | StatEdit;

const NUMBER_MAX: Record<Exclude<StatField, "name">, number> = {
  cp: 2_000_000_000,
  cost: 2_000_000_000,
  speed: 999.9,
  reload: 999.99,
  penetration: 99999.9,
  armor: 32767,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function displayedStatFields(unit: object): StatField[] {
  const row = unit as Record<string, unknown>;
  const fields: StatField[] = ["name", "cp", "cost"];
  if (asRecord(row.vehicle)) fields.push("speed");
  if (primaryRawWeapon(row)) fields.push("reload", "penetration");
  if (hullFrontPlate(row)) fields.push("armor");
  return fields;
}

export function applyDisplayedStat(
  unit: Record<string, unknown>,
  field: StatField,
  value: string | number | null,
): { ok: true; undo: () => void } | { ok: false; error: string } {
  if (!displayedStatFields(unit).includes(field)) {
    return { ok: false, error: "Stat is not in the snapshot" };
  }
  if (field === "name") {
    if (typeof value !== "string") return { ok: false, error: "Invalid name" };
    const name = value.replace(/\s+/g, " ").trim();
    if (!name || name.length > 300) return { ok: false, error: "Invalid name" };
    const prev = unit.name;
    unit.name = name;
    return {
      ok: true,
      undo() {
        unit.name = prev;
      },
    };
  }
  if (
    value !== null &&
    (typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > NUMBER_MAX[field])
  ) {
    return { ok: false, error: "Invalid number" };
  }
  if (field === "cp" || field === "cost") {
    const key = field === "cp" ? "cp" : "cost";
    const prev = unit[key];
    unit[key] = value;
    return {
      ok: true,
      undo() {
        unit[key] = prev;
      },
    };
  }
  if (field === "speed") {
    const vehicle = asRecord(unit.vehicle);
    if (!vehicle) return { ok: false, error: "Stat is not in the snapshot" };
    const mobility = asRecord(vehicle.mobility);
    const prevMobility = vehicle.mobility;
    const nextMobility = mobility ?? {};
    const prev = mobility ? mobility.speed : undefined;
    if (!mobility) vehicle.mobility = nextMobility;
    nextMobility.speed = value;
    return {
      ok: true,
      undo() {
        if (!mobility) vehicle.mobility = prevMobility;
        else nextMobility.speed = prev;
      },
    };
  }
  const weapon = primaryRawWeapon(unit) as Record<string, unknown> | null;
  if (field === "reload" || field === "penetration") {
    if (!weapon) return { ok: false, error: "Stat is not in the snapshot" };
    if (field === "reload") {
      const prev = weapon.reload;
      weapon.reload = value;
      return {
        ok: true,
        undo() {
          weapon.reload = prev;
        },
      };
    }
    const ap = asRecord(weapon.ap);
    const prevAp = weapon.ap;
    const nextAp = ap ?? {};
    const prev = ap ? ap.pointBlank : undefined;
    if (!ap) weapon.ap = nextAp;
    nextAp.pointBlank = value;
    return {
      ok: true,
      undo() {
        if (!ap) weapon.ap = prevAp;
        else nextAp.pointBlank = prev;
      },
    };
  }
  const plate = hullFrontPlate(unit) as Record<string, unknown> | null;
  if (!plate) return { ok: false, error: "Stat is not in the snapshot" };
  const prev = plate.front;
  plate.front = value;
  return {
    ok: true,
    undo() {
      plate.front = prev;
    },
  };
}

export function requestHostname(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const value = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!value) return null;
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end <= 1) return null;
    const rest = value.slice(end + 1);
    if (rest && !/^:\d+$/.test(rest)) return null;
    return value.slice(1, end);
  }
  const colon = value.indexOf(":");
  if (colon === -1) return value;
  if (value.indexOf(":", colon + 1) !== -1) return null;
  const host = value.slice(0, colon);
  const port = value.slice(colon + 1);
  if (!host || !/^\d+$/.test(port)) return null;
  return host;
}

export function localEditsAllowed(hostHeader: string | null): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.VERCEL) return false;
  const host = requestHostname(hostHeader);
  return host != null && LOOPBACK.has(host);
}

function textField(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return null;
}

export function sameUnitIdentity(current: object, next: object): boolean {
  const a = current as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  const idA = textField(a.id);
  const idB = textField(b.id);
  const rosterA = textField(a.roster);
  const rosterB = textField(b.roster);
  const periodA = textField(a.period);
  const periodB = textField(b.period);
  const sideA = textField(a.side);
  const sideB = textField(b.side);
  if (
    idA == null ||
    idB == null ||
    !idA ||
    rosterA == null ||
    rosterB == null ||
    periodA == null ||
    periodB == null ||
    sideA == null ||
    sideB == null
  ) {
    return false;
  }
  return (
    idA === idB &&
    rosterA === rosterB &&
    periodA === periodB &&
    sideA === sideB
  );
}

export function replaceUnitAt(
  units: unknown[],
  index: number,
  next: unknown,
): { ok: true } | { ok: false; status: number; error: string } {
  if (!Number.isInteger(index) || index < 0 || index >= units.length) {
    return { ok: false, status: 404, error: "Unit not found" };
  }
  const current = units[index];
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    return { ok: false, status: 404, error: "Unit not found" };
  }
  if (!next || typeof next !== "object" || Array.isArray(next)) {
    return { ok: false, status: 400, error: "Unit must be an object" };
  }
  if (!sameUnitIdentity(current, next)) {
    return {
      ok: false,
      status: 409,
      error: "id, roster, side, and period must stay the same",
    };
  }
  units[index] = next;
  return { ok: true };
}

export function patchResearchUnits(
  units: unknown[],
  factionSlug: string,
  nodeSlug: string,
  costs: number | null,
  requires: string[],
): { count: number; undo: () => void } {
  const prev: { row: Record<string, unknown>; research: unknown }[] = [];
  for (const unit of units) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit)) continue;
    const row = unit as Record<string, unknown>;
    if (factionSlugOf(row.side) !== factionSlug) continue;
    const research = row.research;
    if (!research || typeof research !== "object" || Array.isArray(research)) continue;
    const block = research as Record<string, unknown>;
    if (typeof block.id !== "string" || !block.id) continue;
    if (researchSlug(block.id) !== nodeSlug) continue;
    prev.push({ row, research });
    row.research = { ...block, requires: [...requires], costs };
  }
  return {
    count: prev.length,
    undo() {
      for (const item of prev) item.row.research = item.research;
    },
  };
}

export function parseLocalEdit(json: unknown): EditBody | { error: string } {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { error: "Body must be an object" };
  }
  const body = json as Record<string, unknown>;
  if (body.kind === "unit") {
    if (typeof body.slug !== "string" || !SLUG.test(body.slug)) {
      return { error: "Invalid slug" };
    }
    if (!body.unit || typeof body.unit !== "object" || Array.isArray(body.unit)) {
      return { error: "Unit must be an object" };
    }
    return { kind: "unit", slug: body.slug, unit: body.unit as Record<string, unknown> };
  }
  if (body.kind === "research") {
    if (typeof body.factionSlug !== "string" || !SLUG.test(body.factionSlug)) {
      return { error: "Invalid faction" };
    }
    if (typeof body.nodeSlug !== "string" || !SLUG.test(body.nodeSlug)) {
      return { error: "Invalid node" };
    }
    if (
      body.costs !== null &&
      (typeof body.costs !== "number" ||
        !Number.isFinite(body.costs) ||
        body.costs < 0 ||
        body.costs > 2_000_000_000)
    ) {
      return { error: "Invalid cost" };
    }
    if (!Array.isArray(body.requires) || body.requires.length > 40) {
      return { error: "Invalid requires" };
    }
    const requires: string[] = [];
    for (const item of body.requires) {
      if (typeof item !== "string" || !item.trim() || item.length > 200) {
        return { error: "Invalid requires" };
      }
      requires.push(item);
    }
    return {
      kind: "research",
      factionSlug: body.factionSlug,
      nodeSlug: body.nodeSlug,
      costs: body.costs,
      requires,
    };
  }
  if (body.kind === "stat") {
    if (typeof body.slug !== "string" || !SLUG.test(body.slug)) {
      return { error: "Invalid slug" };
    }
    if (typeof body.field !== "string" || !STAT_FIELDS.includes(body.field as StatField)) {
      return { error: "Invalid field" };
    }
    const field = body.field as StatField;
    if (field === "name") {
      if (typeof body.value !== "string") return { error: "Invalid name" };
      return { kind: "stat", slug: body.slug, field, value: body.value };
    }
    if (body.value !== null && typeof body.value !== "number") {
      return { error: "Invalid number" };
    }
    return { kind: "stat", slug: body.slug, field, value: body.value };
  }
  return { error: "Unknown edit" };
}

export function isEditBody(value: EditBody | { error: string }): value is EditBody {
  return !("error" in value);
}

export function writeSnapshotFile(doc: unknown, file: string) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc, null, 2));
  renameSync(tmp, file);
}

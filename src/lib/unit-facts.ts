export type SquadMember = {
  role: string;
  count: number;
  weapon: string;
  caliberMm: number | null;
  rpm: number | null;
  rangeM: number | null;
};

export type PenSeries = {
  kind: string;
  name: string;
  points: { rangeM: number; mm: number }[];
};

export type UnitFacts = {
  slug: string;
  name: string;
  hp: number | null;
  armor: number | null;
  speed: number | null;
  reload: number | null;
  vision: number | null;
  squadSize: number | null;
  caliber: number | null;
  range: number | null;
  cp: number | null;
  cost: number | null;
  members: SquadMember[];
  penetration: PenSeries[];
};

type FactUnit = {
  slug: string;
  name: string;
  squadSize: number | null;
  members?: SquadMember[];
  stats: {
    hp: number | null;
    armorFrontMm: number | null;
    speedRoadKmh: number | null;
    reloadS: number | null;
    visionRangeM: number | null;
    caliberMm: number | null;
    rangeM: number | null;
    extra?: unknown;
  } | null;
  costs: { kind: string; amount: number | string }[];
  weapons: {
    ammo: { ammoId: number; ammoName: string; kind: string }[];
  }[];
  penetration: {
    ammoTypeId: number;
    rangeM: number;
    penetrationMm: number | string;
    angleDeg: number;
  }[];
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function readMembers(extra: unknown): SquadMember[] {
  if (!extra || typeof extra !== "object") return [];
  const raw = (extra as { members?: unknown }).members;
  if (!Array.isArray(raw)) return [];
  const members: SquadMember[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const role = typeof item.role === "string" ? item.role : "";
    const weapon = typeof item.weapon === "string" ? item.weapon : "";
    const count = num(item.count);
    if (!role || !weapon || count == null || count <= 0) continue;
    members.push({
      role,
      count,
      weapon,
      caliberMm: num(item.caliberMm),
      rpm: num(item.rpm),
      rangeM: num(item.rangeM),
    });
  }
  return members;
}

function costAmount(costs: FactUnit["costs"], kind: string) {
  const row = costs.find((cost) => cost.kind === kind);
  return row ? num(row.amount) : null;
}

function penetrationOf(unit: FactUnit): PenSeries[] {
  const ammo = new Map<number, { kind: string; name: string }>();
  for (const weapon of unit.weapons) {
    for (const shell of weapon.ammo) {
      if (!ammo.has(shell.ammoId)) {
        ammo.set(shell.ammoId, { kind: shell.kind, name: shell.ammoName });
      }
    }
  }
  const groups = new Map<number, PenSeries>();
  for (const point of unit.penetration) {
    if (point.angleDeg !== 0) continue;
    const mm = num(point.penetrationMm);
    const rangeM = num(point.rangeM);
    if (mm == null || rangeM == null) continue;
    const meta = ammo.get(point.ammoTypeId) ?? { kind: "AP", name: "AP" };
    let group = groups.get(point.ammoTypeId);
    if (!group) {
      group = { kind: meta.kind, name: meta.name, points: [] };
      groups.set(point.ammoTypeId, group);
    }
    if (!group.points.some((row) => row.rangeM === rangeM)) {
      group.points.push({ rangeM, mm });
    }
  }
  for (const group of groups.values()) {
    group.points.sort((a, b) => a.rangeM - b.rangeM);
  }
  return [...groups.values()];
}

export function toUnitFacts(unit: FactUnit): UnitFacts {
  const stats = unit.stats;
  return {
    slug: unit.slug,
    name: unit.name,
    hp: stats?.hp ?? null,
    armor: stats?.armorFrontMm ?? null,
    speed: stats?.speedRoadKmh ?? null,
    reload: stats?.reloadS ?? null,
    vision: stats?.visionRangeM ?? null,
    squadSize: unit.squadSize,
    caliber: stats?.caliberMm ?? null,
    range: stats?.rangeM ?? null,
    cp: costAmount(unit.costs, "cp"),
    cost: costAmount(unit.costs, "resources"),
    members: unit.members ?? readMembers(stats?.extra),
    penetration: penetrationOf(unit),
  };
}

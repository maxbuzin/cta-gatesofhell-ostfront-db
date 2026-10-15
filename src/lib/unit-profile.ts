export const TEXT_MAX = 4000;

const NUMBERS = {
  hp: { label: "HP", max: 2_000_000_000, digits: 0 },
  armor: { label: "Armor", max: 32767, digits: 0 },
  speed: { label: "Speed", max: 999.9, digits: 1 },
  reload: { label: "Reload", max: 999.99, digits: 2 },
  penetration: { label: "Penetration", max: 99999.9, digits: 1 },
  cp: { label: "Command points", max: 2_000_000_000, digits: 0 },
  cost: { label: "Resources", max: 2_000_000_000, digits: 0 },
} as const;

const TEXTS = ["bestAt", "weakAgainst", "description"] as const;

export type UnitNumberKey = keyof typeof NUMBERS;
export type UnitTextKey = (typeof TEXTS)[number];

export type UnitProfile = {
  name: string;
  hp: number | null;
  armor: number | null;
  speed: number | null;
  reload: number | null;
  penetration: number | null;
  cp: number | null;
  cost: number | null;
  bestAt: string | null;
  weakAgainst: string | null;
  description: string | null;
};

export type UnitFieldDraft = {
  hp: string;
  armor: string;
  speed: string;
  reload: string;
  penetration: string;
  cp: string;
  cost: string;
  bestAt: string;
  weakAgainst: string;
  description: string;
};

export type UnitDraft = UnitFieldDraft & { name: string };

type Fields = Omit<UnitProfile, "name">;
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function emptyUnitFields(): UnitFieldDraft {
  return {
    hp: "",
    armor: "",
    speed: "",
    reload: "",
    penetration: "",
    cp: "",
    cost: "",
    bestAt: "",
    weakAgainst: "",
    description: "",
  };
}

export function profileToDraft(profile: UnitProfile): UnitDraft {
  const num = (value: number | null) => (value == null ? "" : String(value));
  return {
    name: profile.name,
    hp: num(profile.hp),
    armor: num(profile.armor),
    speed: num(profile.speed),
    reload: num(profile.reload),
    penetration: num(profile.penetration),
    cp: num(profile.cp),
    cost: num(profile.cost),
    bestAt: profile.bestAt ?? "",
    weakAgainst: profile.weakAgainst ?? "",
    description: profile.description ?? "",
  };
}

function parseNumber(value: string, max: number, digits: number) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function parseText(value: string) {
  const text = value.replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  if (text.length > TEXT_MAX) return undefined;
  return text;
}

export function cleanProfileName(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function readUnitFields(draft: UnitFieldDraft): Parsed<Fields> {
  const numbers = {} as Pick<UnitProfile, UnitNumberKey>;
  for (const key of Object.keys(NUMBERS) as UnitNumberKey[]) {
    const spec = NUMBERS[key];
    const parsed = parseNumber(draft[key], spec.max, spec.digits);
    if (parsed === undefined) return { ok: false, error: `Invalid ${spec.label}` };
    numbers[key] = parsed;
  }
  const texts = {} as Pick<UnitProfile, UnitTextKey>;
  for (const key of TEXTS) {
    const parsed = parseText(draft[key]);
    if (parsed === undefined) return { ok: false, error: "Text is too long" };
    texts[key] = parsed;
  }
  return { ok: true, value: { ...numbers, ...texts } };
}

export function readUnitProfile(draft: UnitDraft): Parsed<UnitProfile> {
  const name = cleanProfileName(draft.name);
  if (!name) return { ok: false, error: "Name is required" };
  const fields = readUnitFields(draft);
  if (!fields.ok) return fields;
  return { ok: true, value: { name, ...fields.value } };
}

export function readUnitFieldsForm(form: FormData): Parsed<Fields> {
  const draft = emptyUnitFields();
  for (const key of Object.keys(draft) as (keyof UnitFieldDraft)[]) {
    const raw = form.get(key);
    if (raw == null) continue;
    if (typeof raw !== "string") return { ok: false, error: "Invalid field" };
    draft[key] = raw;
  }
  return readUnitFields(draft);
}

function numberDraft(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return null;
}

export function readUnitProfileJson(body: Record<string, unknown>): Parsed<UnitProfile> {
  if (typeof body.name !== "string") return { ok: false, error: "Name is required" };
  const draft = emptyUnitFields();
  for (const key of Object.keys(NUMBERS) as UnitNumberKey[]) {
    const raw = numberDraft(body[key]);
    if (raw == null) return { ok: false, error: `Invalid ${NUMBERS[key].label}` };
    draft[key] = raw;
  }
  for (const key of TEXTS) {
    const raw = body[key];
    if (raw == null) continue;
    if (typeof raw !== "string") return { ok: false, error: "Invalid text" };
    draft[key] = raw;
  }
  return readUnitProfile({ name: body.name, ...draft });
}

import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { z } from "zod";

export const SORT_KEYS = [
  "name_asc",
  "name_desc",
  "hp_asc",
  "hp_desc",
  "armor_asc",
  "armor_desc",
  "speed_asc",
  "speed_desc",
  "pen_asc",
  "pen_desc",
] as const;

const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,80}$/, "invalid slug")
  .max(80);

const typeCodeSchema = z
  .string()
  .regex(/^[a-z0-9_]{1,80}$/, "invalid type code")
  .max(80);

const boundedInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable();

export const unitsSearchParams = {
  q: parseAsString.withDefault(""),
  faction: parseAsArrayOf(parseAsString).withDefault([]),
  type: parseAsArrayOf(parseAsString).withDefault([]),
  specialty: parseAsArrayOf(parseAsString).withDefault([]),
  sort: parseAsStringEnum([...SORT_KEYS]).withDefault("name_asc"),
  cursor: parseAsString,
  pageSize: parseAsInteger.withDefault(25),
  view: parseAsStringEnum(["table", "cards"] as const).withDefault("table"),
  penMin: parseAsInteger,
  penMax: parseAsInteger,
  armorMin: parseAsInteger,
  armorMax: parseAsInteger,
  speedMin: parseAsInteger,
  speedMax: parseAsInteger,
  rangeMin: parseAsInteger,
  rangeMax: parseAsInteger,
  helmetMin: parseAsInteger,
  helmetMax: parseAsInteger,
  shieldMin: parseAsInteger,
  shieldMax: parseAsInteger,
  tier: parseAsArrayOf(parseAsInteger).withDefault([]),
};

export const unitsSearchParamsCache =
  createSearchParamsCache(unitsSearchParams);

export function normalizeUnitsParams(raw: {
  q: string;
  faction: string[];
  type: string[];
  specialty: string[];
  sort: (typeof SORT_KEYS)[number];
  cursor: string | null;
  pageSize: number;
  penMin: number | null;
  penMax: number | null;
  armorMin: number | null;
  armorMax: number | null;
  speedMin: number | null;
  speedMax: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  helmetMin: number | null;
  helmetMax: number | null;
  shieldMin: number | null;
  shieldMax: number | null;
  tier: number[];
}) {
  const schema = z.object({
    q: z.string().max(64),
    faction: z.array(slugSchema).max(20),
    type: z.array(typeCodeSchema).max(20),
    specialty: z.array(slugSchema).max(20),
    sort: z.enum(SORT_KEYS),
    cursor: z.string().max(256).nullable(),
    pageSize: z.number().int().min(1).max(50),
    penMin: boundedInt(0, 10_000),
    penMax: boundedInt(0, 10_000),
    armorMin: boundedInt(0, 10_000),
    armorMax: boundedInt(0, 10_000),
    speedMin: boundedInt(0, 500),
    speedMax: boundedInt(0, 500),
    rangeMin: boundedInt(0, 50_000),
    rangeMax: boundedInt(0, 50_000),
    helmetMin: boundedInt(0, 100_000),
    helmetMax: boundedInt(0, 100_000),
    shieldMin: boundedInt(0, 100_000),
    shieldMax: boundedInt(0, 100_000),
    tier: z.array(z.number().int().min(0).max(20)).max(20),
  });

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      q: "",
      faction: [] as string[],
      type: [] as string[],
      specialty: [] as string[],
      sort: "name_asc" as const,
      cursor: null as string | null,
      pageSize: 25,
      penMin: undefined as number | undefined,
      penMax: undefined as number | undefined,
      armorMin: undefined as number | undefined,
      armorMax: undefined as number | undefined,
      speedMin: undefined as number | undefined,
      speedMax: undefined as number | undefined,
      rangeMin: undefined as number | undefined,
      rangeMax: undefined as number | undefined,
      helmetMin: undefined as number | undefined,
      helmetMax: undefined as number | undefined,
      shieldMin: undefined as number | undefined,
      shieldMax: undefined as number | undefined,
      tier: [] as number[],
    };
  }

  const d = parsed.data;
  return {
    q: d.q.slice(0, 64),
    faction: d.faction,
    type: d.type,
    specialty: d.specialty,
    sort: d.sort,
    cursor: d.cursor,
    pageSize: Math.min(50, d.pageSize),
    penMin: d.penMin ?? undefined,
    penMax: d.penMax ?? undefined,
    armorMin: d.armorMin ?? undefined,
    armorMax: d.armorMax ?? undefined,
    speedMin: d.speedMin ?? undefined,
    speedMax: d.speedMax ?? undefined,
    rangeMin: d.rangeMin ?? undefined,
    rangeMax: d.rangeMax ?? undefined,
    helmetMin: d.helmetMin ?? undefined,
    helmetMax: d.helmetMax ?? undefined,
    shieldMin: d.shieldMin ?? undefined,
    shieldMax: d.shieldMax ?? undefined,
    tier: d.tier,
  };
}

import { z } from "zod";

/** Sort keys allowed in list units keyset cursors (must match SORT_MAP). */
export const CURSOR_SORT_KEYS = [
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

export type CursorSortKey = (typeof CURSOR_SORT_KEYS)[number];

export type CursorPayload = {
  id: number;
  v: string | number | null;
  k: CursorSortKey;
};

const cursorSchema = z.object({
  id: z.number().int().finite(),
  v: z.union([z.string(), z.number().finite(), z.null()]),
  k: z.enum(CURSOR_SORT_KEYS),
});

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Decode and validate a keyset cursor. Invalid / mismatched sort → null (page 1).
 */
export function decodeCursor(
  raw: string | null | undefined,
  expectedSort: CursorSortKey,
): CursorPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as unknown;
    const result = cursorSchema.safeParse(parsed);
    if (!result.success) return null;
    if (result.data.k !== expectedSort) return null;
    // Name sorts must carry a string value (column is NOT NULL).
    if (result.data.k.startsWith("name_") && typeof result.data.v !== "string") {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export type KeysetDir = "asc" | "desc";

/**
 * Pure description of the NULLS LAST keyset predicate (for SQL builders + tests).
 *
 * Asc + non-null v: col > v OR (col = v AND id > cid) OR col IS NULL
 * Asc + null v:     col IS NULL AND id > cid
 * Desc + non-null v: col < v OR (col = v AND id < cid) OR col IS NULL
 * Desc + null v:     col IS NULL AND id < cid
 */
export function describeKeysetPredicate(
  dir: KeysetDir,
  cursor: CursorPayload,
): {
  mode: "null-page" | "value-page";
  idOp: ">" | "<";
  valueOp: ">" | "<";
  includeNullsInValuePage: boolean;
} {
  const idOp = dir === "asc" ? ">" : "<";
  const valueOp = dir === "asc" ? ">" : "<";
  if (cursor.v === null) {
    return {
      mode: "null-page",
      idOp,
      valueOp,
      includeNullsInValuePage: false,
    };
  }
  return {
    mode: "value-page",
    idOp,
    valueOp,
    includeNullsInValuePage: true,
  };
}

/** Simulate NULLS LAST ordering for unit tests (no DB). */
export function orderNullsLast<T>(
  rows: T[],
  dir: KeysetDir,
  getValue: (row: T) => string | number | null,
  getId: (row: T) => number,
): T[] {
  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av === null && bv === null) {
      return dir === "asc" ? getId(a) - getId(b) : getId(b) - getId(a);
    }
    if (av === null) return 1; // nulls last
    if (bv === null) return -1;
    if (av === bv) {
      return dir === "asc" ? getId(a) - getId(b) : getId(b) - getId(a);
    }
    if (dir === "asc") return av < bv ? -1 : 1;
    return av > bv ? -1 : 1;
  });
}

/** Whether `row` comes after `cursor` under NULLS LAST keyset rules. */
export function rowAfterCursor(
  dir: KeysetDir,
  cursor: CursorPayload,
  value: string | number | null,
  id: number,
): boolean {
  const pred = describeKeysetPredicate(dir, cursor);
  if (pred.mode === "null-page") {
    if (value !== null) return false;
    return pred.idOp === ">" ? id > cursor.id : id < cursor.id;
  }
  // value-page
  if (value === null) return pred.includeNullsInValuePage;
  if (value === cursor.v) {
    return pred.idOp === ">" ? id > cursor.id : id < cursor.id;
  }
  if (pred.valueOp === ">") return (value as number | string) > (cursor.v as number | string);
  return (value as number | string) < (cursor.v as number | string);
}

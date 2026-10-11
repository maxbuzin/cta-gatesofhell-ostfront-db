import { z } from "zod";

const unitSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

const MAX_COMPARE_UNITS = 4;

/**
 * Normalize `?units=` (string | string[] | repeated params) into ≤4 unique
 * valid slugs. Invalid input yields [] — never throws.
 */
export function parseCompareUnitSlugs(
  units: string | string[] | undefined | null,
): string[] {
  const raw: string[] = [];
  if (units == null) {
    return [];
  }
  if (Array.isArray(units)) {
    for (const entry of units) {
      if (typeof entry === "string") raw.push(entry);
    }
  } else if (typeof units === "string") {
    raw.push(units);
  } else {
    return [];
  }

  const flattened = raw.flatMap((part) => part.split(","));
  const slugs: string[] = [];
  const seen = new Set<string>();

  for (const part of flattened) {
    const trimmed = part.trim();
    if (!unitSlugSchema.safeParse(trimmed).success) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    slugs.push(trimmed);
    if (slugs.length >= MAX_COMPARE_UNITS) break;
  }

  return slugs;
}

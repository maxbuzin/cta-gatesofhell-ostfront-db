import { z } from "zod";

import { FACTIONS } from "@/lib/factions";

/** Path/param slug: lowercase kebab, ≤80 chars. */
export const factionSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

const known = new Set(FACTIONS.map((f) => f.slug));

/** True if slug matches format and is a known faction (UI allowlist). */
export function isKnownFactionSlug(slug: string): boolean {
  return factionSlugSchema.safeParse(slug).success && known.has(slug);
}

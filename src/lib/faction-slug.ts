import { z } from "zod";

/** Path/param slug: lowercase kebab, ≤80 chars. */
export const factionSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

/** True when the slug matches the faction path format. */
export function isKnownFactionSlug(slug: string): boolean {
  return factionSlugSchema.safeParse(slug).success;
}

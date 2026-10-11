import { z } from "zod";

import type { Issue, UnitDraft } from "./types.ts";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,79}$/, "invalid slug");

const costSchema = z.object({
  kind: z.enum(["cp", "resources"]),
  amount: z.number().int().nonnegative().max(1_000_000),
});

/** Zod gate after parse/normalize — every draft field is length-capped plain data. */
export const unitDraftSchema = z.object({
  tab: z.string().min(1).max(80),
  rowNumber: z.number().int().positive(),
  identityKey: z.string().min(1).max(500),
  name: z.string().min(1).max(200),
  factionSlug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  unitTypeCode: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_]{0,63}$/),
  slug: slugSchema.optional(),
  notes: z.string().max(4000).nullable(),
  tier: z.number().int().min(0).max(20).nullable(),
  squadSize: z.number().int().min(0).max(200).nullable(),
  crewSize: z.number().int().min(0).max(200).nullable(),
  specialties: z.array(z.string().max(120)).max(40),
  sourceKey: z.string().min(1).max(80),
  costs: z.array(costSchema).max(8),
  weaponName: z.string().max(200).nullable(),
  stats: z.record(z.union([z.number(), z.string(), z.null()])).refine(
    (o) => Object.keys(o).length <= 80,
    "too many stats keys",
  ),
  extra: z.record(z.union([z.number(), z.string()])).refine(
    (o) => Object.keys(o).length <= 80,
    "too many extra keys",
  ),
  discriminator: z.string().max(200).nullable(),
  rawFingerprint: z.string().max(50_000),
});

export function validateDrafts(drafts: UnitDraft[]): {
  drafts: UnitDraft[];
  issues: Issue[];
} {
  const out: UnitDraft[] = [];
  const issues: Issue[] = [];
  for (const d of drafts) {
    const parsed = unitDraftSchema.safeParse(d);
    if (!parsed.success) {
      issues.push({
        level: "error",
        code: "zod_reject",
        tab: d.tab,
        row: d.rowNumber,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
          .slice(0, 500),
      });
      continue;
    }
    out.push(d);
  }
  return { drafts: out, issues };
}

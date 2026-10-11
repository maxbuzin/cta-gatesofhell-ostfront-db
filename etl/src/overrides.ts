import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import type { UnitDraft } from "./types.ts";

const overrideFileSchema = z
  .object({
    slug: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/)).optional(),
    unitType: z.record(z.string()).optional(),
    skipRows: z
      .array(z.object({ tab: z.string(), row: z.number().int().positive() }))
      .optional(),
    rename: z.record(z.string().max(200)).optional(),
  })
  .strict();

export type Overrides = z.infer<typeof overrideFileSchema>;

export function loadOverrides(root: string): Overrides {
  const dir = join(root, "data/overrides");
  if (!existsSync(dir)) return {};
  const merged: Overrides = { slug: {}, unitType: {}, skipRows: [], rename: {} };
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    if (file === "schema.json" || file === "example.json") continue;
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const parsed = overrideFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid override file ${file}: ${parsed.error.message}`);
    }
    Object.assign(merged.slug!, parsed.data.slug ?? {});
    Object.assign(merged.unitType!, parsed.data.unitType ?? {});
    Object.assign(merged.rename!, parsed.data.rename ?? {});
    merged.skipRows!.push(...(parsed.data.skipRows ?? []));
  }
  return merged;
}

export function applyOverrides(
  drafts: UnitDraft[],
  overrides: Overrides,
): UnitDraft[] {
  const skip = new Set(
    (overrides.skipRows ?? []).map((s) => `${s.tab}!${s.row}`),
  );
  return drafts
    .filter((d) => !skip.has(`${d.tab}!${d.rowNumber}`))
    .map((d) => {
      const key = `${d.tab}:${d.factionSlug}:${d.name}`;
      const renamed = overrides.rename?.[key];
      if (renamed) d = { ...d, name: renamed };
      const type = overrides.unitType?.[key];
      if (type) d = { ...d, unitTypeCode: type };
      const slug = overrides.slug?.[key];
      if (slug) d = { ...d, slug };
      return d;
    });
}

"use server";

import { z } from "zod";

import { getUnitBySlug } from "@/lib/db/queries/units";
import { toUnitFacts, type UnitFacts } from "@/lib/unit-facts";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

export async function loadUnitFacts(slugs: string[]): Promise<UnitFacts[]> {
  const unique = [...new Set(slugs)].filter((slug) => slugSchema.safeParse(slug).success).slice(0, 12);
  const rows = await Promise.all(unique.map((slug) => getUnitBySlug(slug)));
  const facts: UnitFacts[] = [];
  for (const row of rows) {
    if (row) facts.push(toUnitFacts(row));
  }
  return facts;
}

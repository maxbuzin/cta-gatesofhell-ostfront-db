import { readFileSync } from "node:fs";
import { join } from "node:path";

import { collapseName, sanitizePlainText, stripEmbeddedId } from "./text.ts";

type Typos = {
  unitName: Record<string, string>;
  weaponName: Record<string, string>;
  weaponNormalize: { pattern: string; replace: string }[];
};

let typosCache: Typos | null = null;

export function loadTypos(root: string): Typos {
  if (typosCache) return typosCache;
  typosCache = JSON.parse(
    readFileSync(join(root, "etl/maps/typos.json"), "utf8"),
  ) as Typos;
  return typosCache;
}

export function normalizeUnitName(raw: string, root: string): {
  name: string;
  ieId: string | null;
} {
  const typos = loadTypos(root);
  let name = collapseName(raw);
  if (typos.unitName[name]) name = typos.unitName[name]!;
  const stripped = stripEmbeddedId(name);
  return stripped;
}

export function normalizeWeaponName(raw: string, root: string): string {
  const typos = loadTypos(root);
  let name = sanitizePlainText(raw, 200);
  for (const rule of typos.weaponNormalize) {
    name = name.replace(new RegExp(rule.pattern, "g"), rule.replace);
  }
  for (const [from, to] of Object.entries(typos.weaponName)) {
    name = name.split(from).join(to);
  }
  return name.replace(/\s+/g, " ").trim();
}

export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function roundSmallint(n: number): number {
  return Math.round(n);
}

export function parseYesNo(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (s === "yes") return 1;
  if (s === "no") return 0;
  return null;
}

export function splitSpecialties(
  raw: string,
  compounds: string[],
): string[] {
  const text = sanitizePlainText(raw, 500);
  if (!text) return [];
  const found: string[] = [];
  let rest = text;
  for (const c of compounds) {
    if (rest.includes(c)) {
      found.push(c);
      rest = rest.split(c).join("|||");
    }
  }
  for (const part of rest.split(/[,;|]+/)) {
    const p = part.replace(/\|/g, "").trim();
    if (p && !found.includes(p)) found.push(p);
  }
  return found;
}

export function mapAmmoTokens(
  raw: string,
  ammoKindMap: Record<string, string>,
): { kinds: string[]; unknown: string[] } {
  const text = sanitizePlainText(raw, 300);
  if (!text) return { kinds: [], unknown: [] };
  const tokens = text.split(/[,;/]+/).map((t) => t.trim()).filter(Boolean);
  const kinds: string[] = [];
  const unknown: string[] = [];
  for (const t of tokens) {
    const key = t.toUpperCase();
    const mapped = ammoKindMap[key] ?? ammoKindMap[t];
    if (mapped) kinds.push(mapped);
    else {
      unknown.push(t);
      kinds.push("Other");
    }
  }
  return { kinds: [...new Set(kinds)], unknown };
}

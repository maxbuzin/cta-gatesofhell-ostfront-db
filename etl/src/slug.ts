import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { UnitDraft } from "./types.ts";

const require = createRequire(import.meta.url);
// CJS/ESM interop for @sindresorhus/slugify
const slugifyMod = require("@sindresorhus/slugify");
const slugifyFn: (input: string, options?: object) => string =
  typeof slugifyMod === "function"
    ? slugifyMod
    : (slugifyMod.default ?? slugifyMod);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function makeSlug(input: string): string {
  let s = slugifyFn(input, {
    decamelize: false,
    customReplacements: [
      ["&", " and "],
      ["×", "x"],
      ["+", " plus "],
      ["*", " star "],
    ],
  });
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (s.length > 80) {
    const cut = s.slice(0, 80);
    const last = cut.lastIndexOf("-");
    s = (last > 0 ? cut.slice(0, last) : cut).replace(/-$/, "");
  }
  if (!SLUG_RE.test(s)) {
    s = (`u-${s}`).replace(/[^a-z0-9-]/g, "").slice(0, 80);
    if (!SLUG_RE.test(s)) s = `unit-${Math.abs(hash(input)) % 1e9}`;
  }
  return s;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

type LockKey = string;
type LockFile = Record<LockKey, string>;

function lockPath(root: string): string {
  return join(root, "etl/slug-lock.json");
}

export function loadSlugLock(root: string): LockFile {
  const p = lockPath(root);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8")) as LockFile;
}

export function saveSlugLock(root: string, lock: LockFile): void {
  writeFileSync(lockPath(root), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

function lockKey(u: UnitDraft): LockKey {
  return [u.tab, u.factionSlug, u.name, u.discriminator ?? ""].join("\t");
}

/** Assign stable unique slugs; persist new ones into slug-lock. */
export function assignSlugs(
  units: UnitDraft[],
  root: string,
  persist: boolean,
): UnitDraft[] {
  const lock = loadSlugLock(root);
  const used = new Set<string>(Object.values(lock));

  // Group by base slug for collision handling
  const withBase = units.map((u) => {
    const key = lockKey(u);
    if (lock[key]) return { u, base: lock[key]!, locked: true };
    return { u, base: makeSlug(u.name), locked: false };
  });

  const byBase = new Map<string, typeof withBase>();
  for (const item of withBase) {
    if (item.locked) continue;
    const list = byBase.get(item.base) ?? [];
    list.push(item);
    byBase.set(item.base, list);
  }

  for (const [base, group] of byBase) {
    const factions = new Set(group.map((g) => g.u.factionSlug));
    if (factions.size > 1) {
      for (const g of group) {
        g.base = makeSlug(`${g.u.name}-${g.u.factionSlug}`);
      }
    }
  }

  // Rebuild groups after faction suffix
  byBase.clear();
  for (const item of withBase) {
    if (item.locked) continue;
    const list = byBase.get(item.base) ?? [];
    list.push(item);
    byBase.set(item.base, list);
  }

  for (const [, group] of byBase) {
    if (group.length <= 1) continue;
    for (const g of group) {
      const disc =
        g.u.discriminator ||
        (g.u.weaponName ? makeSlug(g.u.weaponName) : null);
      if (disc) g.base = makeSlug(`${g.u.name}-${g.u.factionSlug}-${disc}`);
    }
  }

  // Final uniqueness with counters
  const assigned = new Map<string, number>();
  for (const item of withBase) {
    let slug = item.locked ? item.base : item.base;
    if (!item.locked) {
      if (used.has(slug) || assigned.has(slug)) {
        let n = (assigned.get(slug) ?? 1) + 1;
        let candidate = `${slug}-${n}`;
        while (used.has(candidate) || assigned.has(candidate)) {
          n++;
          candidate = `${slug}-${n}`;
        }
        slug = makeSlug(candidate);
      }
      assigned.set(slug, 1);
      used.add(slug);
      lock[lockKey(item.u)] = slug;
    }
    item.u.slug = slug;
  }

  if (persist) saveSlugLock(root, lock);
  return withBase.map((x) => x.u);
}

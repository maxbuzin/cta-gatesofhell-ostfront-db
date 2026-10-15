import "server-only";

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

function publicRoot() {
  return path.resolve(process.cwd(), "public");
}

function relPath(folder: "units" | "research", faction: string, slug: string) {
  if (!SLUG.test(faction) || !SLUG.test(slug)) return null;
  return `${folder}/${faction}/${slug}.webp`;
}

function fileFor(rel: string) {
  const root = publicRoot();
  const dest = path.resolve(root, rel);
  if (!dest.startsWith(root + path.sep)) return null;
  return dest;
}

export function unitImageRel(faction: string, slug: string) {
  return relPath("units", faction, slug);
}

export function researchImageRel(faction: string, slug: string) {
  return relPath("research", faction, slug);
}

export function publicImageUrl(rel: string | null) {
  if (!rel) return null;
  const dest = fileFor(rel);
  if (!dest || !existsSync(dest)) return null;
  return `/${rel}`;
}

export function writePublicImage(rel: string | null, bytes: Buffer) {
  if (!rel) throw new Error("bad path");
  const dest = fileFor(rel);
  if (!dest) throw new Error("bad path");
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
}

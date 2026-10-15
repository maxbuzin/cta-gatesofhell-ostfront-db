import { revalidateTag } from "next/cache";

import {
  createFaction,
  createResearch,
  createUnit,
  createResearchSection,
  deleteResearchNode,
  deleteResearchSection,
  deleteUnit,
  moveResearchNode,
  moveResearchSection,
  renameResearchSection,
  patchResearchNode,
  patchUnitStat,
  saveUnitProfile,
  saveUnitLoadout,
  setResearchParent,
  setResearchSection,
  placeResearchGrid,
  placeResearchRoutes,
} from "@/lib/db/manual";
import { parseRoute } from "@/lib/research-route";
import { editsOpen } from "@/lib/local-edit";
import { readUnitFieldsForm, readUnitProfileJson } from "@/lib/unit-profile";
import { compactUpload } from "@/lib/local-image";
import { researchImageRel, unitImageRel, writePublicImage } from "@/lib/public-image";
import { parseLoadout } from "@/lib/unit-loadout";

const MAX_BODY = 32_768;
const MAX_FORM = 8 * 1024 * 1024 + 65_536;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const STATS = new Set(["name", "cp", "cost", "speed", "reload", "penetration", "armor"]);

function missing() {
  return new Response(null, { status: 404 });
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

function slug(value: unknown) {
  return typeof value === "string" && SLUG.test(value) ? value : null;
}

function parentList(list: unknown, single: unknown) {
  const items: unknown[] = [];
  if (Array.isArray(list)) items.push(...list);
  else if (list != null && list !== "") items.push(list);
  if (!Array.isArray(list) && single != null && single !== "") items.push(single);
  const slugs: string[] = [];
  for (const item of items) {
    if (item == null || item === "") continue;
    const next = slug(item);
    if (!next) return { ok: false as const, error: "Invalid previous research" };
    slugs.push(next);
  }
  return { ok: true as const, slugs };
}

function sectionPick(sectionId: unknown, newSection: unknown, sectionName: unknown) {
  const isNew = newSection === true || newSection === "1" || newSection === "true";
  if (isNew) {
    if (sectionName != null && typeof sectionName !== "string") {
      return { ok: false as const, error: "Invalid section" };
    }
    return { ok: true as const, pick: { name: typeof sectionName === "string" ? sectionName : null } };
  }
  const id =
    typeof sectionId === "number"
      ? sectionId
      : typeof sectionId === "string" && /^[1-9]\d{0,8}$/.test(sectionId)
        ? Number(sectionId)
        : Number.NaN;
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    return { ok: false as const, error: "Section is required" };
  }
  return { ok: true as const, pick: { id } };
}

function positiveId(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > 2_147_483_647) {
    return null;
  }
  return value;
}

function gridCell(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 48) return null;
  return value;
}

function researchCost(value: unknown) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(raw) || raw < 0 || raw > 2_000_000_000) return undefined;
  return Math.round(raw);
}

function revalidateUnit(unitSlug: string) {
  revalidateTag("units", { expire: 0 });
  revalidateTag(`unit:${unitSlug}`, { expire: 0 });
  revalidateTag("factions", { expire: 0 });
  revalidateTag("home", { expire: 0 });
}

function revalidateResearch(factionSlug: string) {
  revalidateTag("research", { expire: 0 });
  revalidateTag(`research:${factionSlug}`, { expire: 0 });
  revalidateTag("units", { expire: 0 });
}

export async function GET() {
  return missing();
}

async function postForm(req: Request) {
  const length = req.headers.get("content-length");
  if (length !== null) {
    const n = Number(length);
    if (!Number.isFinite(n) || n < 0 || n > MAX_FORM) return fail(413, "Body too large");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Invalid form");
  }
  const kind = form.get("kind");
  if (kind !== "unit" && kind !== "research") return fail(400, "Unknown edit");
  const factionSlug = slug(form.get("factionSlug"));
  if (!factionSlug) return fail(400, "Faction is required");
  const name = form.get("name");
  if (typeof name !== "string") return fail(400, "Name is required");
  const image = form.get("image");
  let bytes: Buffer | null = null;
  if (image instanceof File && image.size > 0) {
    const compacted = await compactUpload(image);
    if ("error" in compacted) return fail(400, compacted.error);
    bytes = compacted.bytes;
  }
  const section = sectionPick(form.get("sectionId"), form.get("newSection"), form.get("sectionName"));
  if (!section.ok) return fail(400, section.error);
  if (kind === "unit") {
    const stats = readUnitFieldsForm(form);
    if (!stats.ok) return fail(400, stats.error);
    const result = await createUnit(factionSlug, name, section.pick, stats.value);
    if (!result.ok) return fail(result.status, result.error);
    if (bytes) {
      writePublicImage(unitImageRel(factionSlug, result.slug), bytes);
      if (result.researchSlug) writePublicImage(researchImageRel(factionSlug, result.researchSlug), bytes);
    }
    revalidateUnit(result.slug);
    revalidateResearch(factionSlug);
    return Response.json({ ok: true, slug: result.slug });
  }
  const parents = parentList(form.getAll("parentSlug"), null);
  if (!parents.ok) return fail(400, parents.error);
  const cost = researchCost(form.get("cost"));
  if (cost === undefined) return fail(400, "Invalid cost");
  const result = await createResearch(factionSlug, name, parents.slugs, cost, section.pick);
  if (!result.ok) return fail(result.status, result.error);
  if (bytes) writePublicImage(researchImageRel(factionSlug, result.slug), bytes);
  revalidateResearch(factionSlug);
  return Response.json({ ok: true, slug: result.slug, sectionId: result.sectionId });
}

export async function POST(req: Request) {
  try {
    if (!(await editsOpen())) return missing();
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    if (contentType.startsWith("multipart/form-data")) return postForm(req);
    if (!contentType.startsWith("application/json")) {
      return fail(400, "JSON required");
    }
    const length = req.headers.get("content-length");
    if (length !== null) {
      const n = Number(length);
      if (!Number.isFinite(n) || n < 0 || n > MAX_BODY) return fail(413, "Body too large");
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY) return fail(413, "Body too large");
    let body: Record<string, unknown>;
    try {
      const json = JSON.parse(raw) as unknown;
      if (!json || typeof json !== "object" || Array.isArray(json)) return fail(400, "Body must be an object");
      body = json as Record<string, unknown>;
    } catch {
      return fail(400, "Invalid JSON");
    }

    if (body.kind === "faction") {
      if (typeof body.name !== "string") return fail(400, "Name is required");
      if (typeof body.color !== "string") return fail(400, "Color is required");
      const result = await createFaction(body.name, body.color);
      if (!result.ok) return fail(result.status, result.error);
      revalidateTag("factions", { expire: 0 });
      revalidateTag("home", { expire: 0 });
      return Response.json({ ok: true, slug: result.slug });
    }

    if (body.kind === "unit") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug) return fail(400, "Faction is required");
      if (typeof body.name !== "string") return fail(400, "Name is required");
      const section = sectionPick(body.sectionId, body.newSection, body.sectionName);
      if (!section.ok) return fail(400, section.error);
      const result = await createUnit(factionSlug, body.name, section.pick);
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(result.slug);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true, slug: result.slug });
    }

    if (body.kind === "research") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug) return fail(400, "Faction is required");
      if (typeof body.name !== "string") return fail(400, "Name is required");
      const parents = parentList(body.parentSlugs, body.parentSlug);
      if (!parents.ok) return fail(400, parents.error);
      const cost = researchCost(body.cost);
      if (cost === undefined) return fail(400, "Invalid cost");
      const section = sectionPick(body.sectionId, body.newSection, body.sectionName);
      if (!section.ok) return fail(400, section.error);
      const result = await createResearch(factionSlug, body.name, parents.slugs, cost, section.pick);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true, slug: result.slug, sectionId: result.sectionId });
    }

    if (body.kind === "unit-profile") {
      const unitSlug = slug(body.slug);
      if (!unitSlug) return fail(400, "Invalid unit");
      const profile = readUnitProfileJson(body);
      if (!profile.ok) return fail(400, profile.error);
      const result = await saveUnitProfile(unitSlug, profile.value);
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(unitSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "unit-loadout") {
      const unitSlug = slug(body.slug);
      if (!unitSlug) return fail(400, "Invalid unit");
      const loadout = parseLoadout(body);
      if (!loadout.ok) return fail(400, loadout.error);
      const result = await saveUnitLoadout(unitSlug, loadout.value);
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(unitSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "stat") {
      const unitSlug = slug(body.slug);
      if (!unitSlug || typeof body.field !== "string" || !STATS.has(body.field)) {
        return fail(400, "Invalid field");
      }
      if (body.field !== "name" && body.value !== null && typeof body.value !== "number") {
        return fail(400, "Invalid number");
      }
      if (body.field === "name" && typeof body.value !== "string") return fail(400, "Invalid name");
      const result = await patchUnitStat(
        unitSlug,
        body.field as "name" | "cp" | "cost" | "speed" | "reload" | "penetration" | "armor",
        body.value as string | number | null,
      );
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(unitSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "node") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      if (!factionSlug || !nodeSlug || (body.field !== "name" && body.field !== "cost")) {
        return fail(400, "Invalid field");
      }
      if (body.field === "name" && typeof body.value !== "string") return fail(400, "Invalid name");
      if (body.field === "cost" && body.value !== null && typeof body.value !== "number") {
        return fail(400, "Invalid number");
      }
      const result = await patchResearchNode(
        factionSlug,
        nodeSlug,
        body.field,
        body.value as string | number | null,
      );
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-grid") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug || !Array.isArray(body.cards)) return fail(400, "Invalid grid");
      const cards: { nodeSlug: string; column: number; row: number }[] = [];
      for (const item of body.cards) {
        if (!item || typeof item !== "object") return fail(400, "Invalid grid");
        const card = item as { nodeSlug?: unknown; column?: unknown; row?: unknown };
        const nodeSlug = slug(card.nodeSlug);
        const column = gridCell(card.column);
        const row = gridCell(card.row);
        if (!nodeSlug || column == null || row == null) return fail(400, "Invalid grid");
        cards.push({ nodeSlug, column, row });
      }
      const result = await placeResearchGrid(factionSlug, cards);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-routes") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug || !Array.isArray(body.edges)) return fail(400, "Invalid route");
      const edges: { fromSlug: string; toSlug: string; route: ReturnType<typeof parseRoute> }[] = [];
      for (const item of body.edges) {
        if (!item || typeof item !== "object") return fail(400, "Invalid route");
        const edge = item as { fromSlug?: unknown; toSlug?: unknown; route?: unknown };
        const fromSlug = slug(edge.fromSlug);
        const toSlug = slug(edge.toSlug);
        if (!fromSlug || !toSlug) return fail(400, "Invalid route");
        const route = edge.route == null ? null : parseRoute(edge.route);
        if (edge.route != null && !route) return fail(400, "Invalid route");
        edges.push({ fromSlug, toSlug, route });
      }
      const result = await placeResearchRoutes(factionSlug, edges);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-order") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      if (!factionSlug || !nodeSlug || (body.dir !== "left" && body.dir !== "right")) {
        return fail(400, "Invalid research");
      }
      const result = await moveResearchNode(factionSlug, nodeSlug, body.dir);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-delete") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      if (!factionSlug || !nodeSlug) return fail(400, "Invalid research");
      const result = await deleteResearchNode(factionSlug, nodeSlug);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "section-delete") {
      const factionSlug = slug(body.factionSlug);
      const sectionId = positiveId(body.sectionId);
      if (!factionSlug || sectionId == null) return fail(400, "Invalid section");
      const result = await deleteResearchSection(factionSlug, sectionId);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "unit-delete") {
      const unitSlug = slug(body.slug);
      if (!unitSlug) return fail(400, "Invalid unit");
      const result = await deleteUnit(unitSlug);
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(unitSlug);
      revalidateTag("research", { expire: 0 });
      return Response.json({ ok: true });
    }

    if (body.kind === "section-create") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug) return fail(400, "Invalid section");
      const result = await createResearchSection(factionSlug);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "section-name") {
      const factionSlug = slug(body.factionSlug);
      const sectionId = positiveId(body.sectionId);
      if (!factionSlug || sectionId == null || (body.name != null && typeof body.name !== "string")) {
        return fail(400, "Invalid section");
      }
      const result = await renameResearchSection(
        factionSlug,
        sectionId,
        typeof body.name === "string" ? body.name : null,
      );
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "section-order") {
      const factionSlug = slug(body.factionSlug);
      const sectionId = positiveId(body.sectionId);
      if (!factionSlug || sectionId == null || (body.dir !== "up" && body.dir !== "down")) {
        return fail(400, "Invalid section");
      }
      const result = await moveResearchSection(factionSlug, sectionId, body.dir);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-section") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      const sectionId = positiveId(body.sectionId);
      if (!factionSlug || !nodeSlug || sectionId == null) return fail(400, "Invalid section");
      const result = await setResearchSection(factionSlug, nodeSlug, sectionId);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    if (body.kind === "research-parent") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      if (!factionSlug || !nodeSlug) return fail(400, "Invalid research");
      const parents = parentList(body.parentSlugs, body.parentSlug);
      if (!parents.ok) return fail(400, parents.error);
      const result = await setResearchParent(factionSlug, nodeSlug, parents.slugs);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    return fail(400, "Unknown edit");
  } catch {
    return fail(500, "Save failed");
  }
}

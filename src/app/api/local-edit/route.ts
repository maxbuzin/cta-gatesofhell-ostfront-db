import { revalidateTag } from "next/cache";

import {
  createFaction,
  createResearch,
  createUnit,
  patchResearchNode,
  patchUnitStat,
  setResearchParent,
} from "@/lib/db/manual";
import { editsOpen } from "@/lib/local-edit";
import { compactUpload } from "@/lib/local-image";
import { researchImageRel, unitImageRel, writePublicImage } from "@/lib/public-image";

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
  if (kind === "unit") {
    const result = await createUnit(factionSlug, name);
    if (!result.ok) return fail(result.status, result.error);
    if (bytes) writePublicImage(unitImageRel(factionSlug, result.slug), bytes);
    revalidateUnit(result.slug);
    return Response.json({ ok: true, slug: result.slug });
  }
  const parentText = form.get("parentSlug");
  const parentValue = typeof parentText === "string" ? parentText : "";
  const parentSlug = parentValue ? slug(parentValue) : null;
  if (parentValue && !parentSlug) return fail(400, "Invalid previous research");
  const result = await createResearch(factionSlug, name, parentSlug);
  if (!result.ok) return fail(result.status, result.error);
  if (bytes) writePublicImage(researchImageRel(factionSlug, result.slug), bytes);
  revalidateResearch(factionSlug);
  return Response.json({ ok: true, slug: result.slug });
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
      const result = await createUnit(factionSlug, body.name);
      if (!result.ok) return fail(result.status, result.error);
      revalidateUnit(result.slug);
      return Response.json({ ok: true, slug: result.slug });
    }

    if (body.kind === "research") {
      const factionSlug = slug(body.factionSlug);
      if (!factionSlug) return fail(400, "Faction is required");
      if (typeof body.name !== "string") return fail(400, "Name is required");
      const parentSlug = body.parentSlug == null || body.parentSlug === "" ? null : slug(body.parentSlug);
      if (body.parentSlug && !parentSlug) return fail(400, "Invalid previous research");
      const result = await createResearch(factionSlug, body.name, parentSlug);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true, slug: result.slug });
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

    if (body.kind === "research-parent") {
      const factionSlug = slug(body.factionSlug);
      const nodeSlug = slug(body.nodeSlug);
      if (!factionSlug || !nodeSlug) return fail(400, "Invalid research");
      const parentSlug = body.parentSlug == null || body.parentSlug === "" ? null : slug(body.parentSlug);
      if (body.parentSlug && !parentSlug) return fail(400, "Invalid previous research");
      const result = await setResearchParent(factionSlug, nodeSlug, parentSlug);
      if (!result.ok) return fail(result.status, result.error);
      revalidateResearch(factionSlug);
      return Response.json({ ok: true });
    }

    return fail(400, "Unknown edit");
  } catch {
    return fail(500, "Save failed");
  }
}

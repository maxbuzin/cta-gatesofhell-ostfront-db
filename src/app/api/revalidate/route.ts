import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getEnv } from "@/lib/env";

const TAG_WHITELIST = new Set([
  "units",
  "home",
  "sources",
  "factions",
  "research",
  "patches",
]);

const TAG_PATTERN = /^(unit|faction|research):[a-z0-9][a-z0-9-]{0,63}$/;

const bodySchema = z
  .object({
    tags: z.array(z.string().min(1).max(80)).min(1).max(100),
  })
  .strict();

function unauthorized() {
  return new Response(null, { status: 404 });
}

function hashToken(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqualToken(got: string, expected: string): boolean {
  const a = hashToken(got);
  const b = hashToken(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const secret = getEnv().REVALIDATE_SECRET;
    if (!secret || secret.length < 32) return unauthorized();

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return unauthorized();
    const token = auth.slice("Bearer ".length);
    if (!safeEqualToken(token, secret)) return unauthorized();

    const contentLength = req.headers.get("content-length");
    if (contentLength !== null) {
      const n = Number(contentLength);
      if (!Number.isFinite(n) || n < 0 || n > 16_384) return unauthorized();
    }

    const raw = await req.text();
    if (raw.length > 16_384) return unauthorized();

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return unauthorized();
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return unauthorized();

    const tags = parsed.data.tags.filter(
      (t) => TAG_WHITELIST.has(t) || TAG_PATTERN.test(t),
    );
    if (tags.length === 0) return unauthorized();

    for (const tag of tags) {
      revalidateTag(tag, "max");
    }

    return Response.json({ revalidated: tags.length });
  } catch {
    return unauthorized();
  }
}

export async function GET() {
  return unauthorized();
}

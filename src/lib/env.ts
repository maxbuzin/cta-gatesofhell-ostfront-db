import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  REVALIDATE_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

/** Production DATABASE_URL must be pooled Neon + goh_app_ro. */
export function assertProductionDatabaseUrl(url: string): void {
  if (!isProductionRuntime()) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  const host = parsed.hostname;
  if (!host.includes("-pooler.") && !host.includes(".pooler.")) {
    throw new Error(
      "DATABASE_URL must use the Neon pooler host in production (…-pooler…)",
    );
  }
  if (parsed.username !== "goh_app_ro") {
    throw new Error("DATABASE_URL user must be goh_app_ro in production");
  }
}

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!parsed.success) {
    if (isProductionRuntime()) {
      throw new Error("Invalid environment configuration");
    }
    console.error("Invalid environment configuration");
    cached = {};
    return cached;
  }
  if (parsed.data.DATABASE_URL) {
    assertProductionDatabaseUrl(parsed.data.DATABASE_URL);
  } else if (isProductionRuntime()) {
    throw new Error("DATABASE_URL is required in production");
  }
  cached = parsed.data;
  return cached;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(getEnv().DATABASE_URL);
}

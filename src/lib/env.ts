import "server-only";

import { z } from "zod";

import {
  assertProductionDatabaseUrl,
  isProductionRuntime,
} from "@/lib/env-guards";

export { assertProductionDatabaseUrl, isProductionRuntime };

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  REVALIDATE_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

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

import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { hasDatabaseUrl, getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export type Db = NeonHttpDatabase<typeof schema>;

let dbInstance: Db | null = null;

export function getDb(): Db | null {
  if (!hasDatabaseUrl()) return null;
  if (dbInstance) return dbInstance;
  const url = getEnv().DATABASE_URL;
  if (!url) return null;
  try {
    const sql = neon(url);
    dbInstance = drizzle(sql, { schema });
    return dbInstance;
  } catch {
    console.error("Database connection failed");
    return null;
  }
}

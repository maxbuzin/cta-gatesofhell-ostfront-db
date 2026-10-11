import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

/** Refuse owner / app-ro URLs. ETL must use goh_etl only. */
export function assertEtlDatabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL_ETL is not a valid URL");
  }
  const user = decodeURIComponent(parsed.username || "");
  if (user === "neondb_owner" || user === "goh_app_ro") {
    throw new Error(
      `DATABASE_URL_ETL must use role goh_etl (refusing user "${user}")`,
    );
  }
  if (user !== "goh_etl") {
    throw new Error(
      `DATABASE_URL_ETL user must be goh_etl (got "${user || "(empty)"}")`,
    );
  }
}

export function createEtlDb(url: string) {
  assertEtlDatabaseUrl(url);
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  return { db, pool };
}

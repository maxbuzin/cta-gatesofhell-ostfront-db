/** True for Vercel Production (or non-Vercel NODE_ENV=production runtime). */
export function isProductionRuntime(): boolean {
  // Preview / Vercel development must render empty states without DATABASE_URL.
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development"
  ) {
    return false;
  }
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

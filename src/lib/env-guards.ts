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

function isVercelPreviewOrProduction(): boolean {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * When a DATABASE_URL is present on Vercel preview/production (or production
 * runtime), reject owner / non-RO users. Production also requires the pooler.
 * Missing DATABASE_URL on preview remains allowed (empty states).
 */
export function assertProductionDatabaseUrl(url: string): void {
  const enforceUser =
    isVercelPreviewOrProduction() || isProductionRuntime();
  const enforcePooler = isProductionRuntime();
  if (!enforceUser && !enforcePooler) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  if (enforceUser) {
    const user = decodeURIComponent(parsed.username || "");
    if (user === "neondb_owner" || user !== "goh_app_ro") {
      throw new Error(
        "DATABASE_URL user must be goh_app_ro (owner URLs are not allowed on Vercel preview/production)",
      );
    }
  }

  if (enforcePooler) {
    const host = parsed.hostname;
    if (!host.includes("-pooler.") && !host.includes(".pooler.")) {
      throw new Error(
        "DATABASE_URL must use the Neon pooler host in production (…-pooler…)",
      );
    }
  }
}

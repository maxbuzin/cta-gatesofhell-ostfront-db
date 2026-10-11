/**
 * Escape LIKE/ILIKE wildcards for Postgres (%, _, \).
 */
export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Allow only https absolute URLs or site-relative paths.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("\n") || trimmed.includes("\r")) return null;
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") return parsed.toString();
    return null;
  } catch {
    return null;
  }
}

export function formatStat(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

/** Fallback when a value is not a safe hex color. */
export const SAFE_CSS_FALLBACK = "#7A8B5C";

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** Chart config keys must be index-based (`u0`…), never data/slugs. */
export const SAFE_CHART_KEY = /^u[0-9]+$/;

/**
 * Accept only `#rgb` / `#rrggbb`. Anything else (slug XSS, named colors, CSS
 * injection) falls back to a fixed token color.
 */
export function safeCssColor(
  value: string | null | undefined,
  fallback: string = SAFE_CSS_FALLBACK,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (HEX.test(trimmed)) return trimmed;
  return HEX.test(fallback) ? fallback : SAFE_CSS_FALLBACK;
}

export function isSafeChartKey(key: string): boolean {
  return SAFE_CHART_KEY.test(key);
}

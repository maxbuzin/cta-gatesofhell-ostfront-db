/**
 * Catch DB/query failures at the call site (page/layout), never inside
 * `'use cache'` functions — empty fallbacks must not be cached.
 */
export async function withQueryFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  logMessage: string,
): Promise<T> {
  try {
    return await fn();
  } catch {
    console.error(logMessage);
    return fallback;
  }
}

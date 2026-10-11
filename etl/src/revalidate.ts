/** Optionally call site revalidate after a successful write. */
export async function maybeRevalidate(): Promise<void> {
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) return;
  try {
    const res = await fetch(new URL("/api/revalidate", site), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags: ["units", "factions", "home", "patches"] }),
    });
    if (!res.ok) {
      console.warn(`revalidate skipped: HTTP ${res.status}`);
    }
  } catch {
    console.warn("revalidate skipped: request failed");
  }
}

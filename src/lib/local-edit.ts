import "server-only";

import { headers } from "next/headers";

import { localEditsAllowed } from "@/lib/local-edit-guard";

export async function editsOpen(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL) return false;
  return localEditsAllowed((await headers()).get("host"));
}

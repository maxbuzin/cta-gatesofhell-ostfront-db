import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseCsv, rowsToObjects } from "./csv.ts";
import type { SheetMapping } from "./mapping.ts";
import { tabNames } from "./mapping.ts";
import type { RawRow, TabName } from "./types.ts";

export type FetchMode =
  | { kind: "local"; dir: string }
  | { kind: "csv-export" }
  | { kind: "service-account" };

/** Load tab CSVs from a local directory (filenames from mapping). */
export function loadLocalCsvs(
  mapping: SheetMapping,
  dir: string,
): RawRow[] {
  const rows: RawRow[] = [];
  for (const tab of tabNames(mapping)) {
    const csvName = mapping.tabs[tab]!.csv;
    const path = join(dir, csvName);
    if (!existsSync(path)) {
      throw new Error(`Missing CSV for tab "${tab}": ${path}`);
    }
    const text = readFileSync(path, "utf8");
    const { records } = rowsToObjects(parseCsv(text));
    for (let i = 0; i < records.length; i++) {
      rows.push({
        tab: tab as TabName,
        rowNumber: i + 2, // header is row 1
        cells: records[i]!,
      });
    }
  }
  return rows;
}

/**
 * Fetch via Google Sheets CSV export URLs.
 * Requires the spreadsheet to be shared to "anyone with the link".
 * Uses sheet titles → gid discovery via the HTML spreadsheet page when possible.
 */
export async function fetchCsvExport(
  mapping: SheetMapping,
  cacheDir: string,
): Promise<RawRow[]> {
  mkdirSync(cacheDir, { recursive: true });
  const id = mapping.spreadsheet.id;
  // Discover gids from the spreadsheet HTML (works when publicly viewable)
  const metaUrl = `https://docs.google.com/spreadsheets/d/${id}/htmlview`;
  const metaRes = await fetch(metaUrl, { redirect: "follow" });
  if (!metaRes.ok) {
    throw new Error(
      `Sheet CSV export unavailable (HTTP ${metaRes.status}). Share the sheet or use --from=data/raw/<dir>.`,
    );
  }
  const html = await metaRes.text();
  if (html.includes("accounts.google.com") || html.includes("ServiceLogin")) {
    throw new Error(
      "Sheet requires login. Share it publicly or use --from=data/raw/<dir> / GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const gidByTitle = new Map<string, string>();
  // sheet tabs appear as name:"Title", gid:123 patterns in bootstrap
  const re =
    /sheetId["\s:]+(\d+)[^]*?name["\s:]+"([^"]+)"|name["\s:]+"([^"]+)"[^]*?sheetId["\s:]+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const gid = m[1] || m[4];
    const title = m[2] || m[3];
    if (gid && title) gidByTitle.set(title, gid);
  }

  const re2 = /\{"sheetId":(\d+),"title":"([^"]+)"/g;
  while ((m = re2.exec(html))) {
    gidByTitle.set(m[2]!, m[1]!);
  }

  const rows: RawRow[] = [];
  for (const tab of tabNames(mapping)) {
    if (mapping.spreadsheet.skipTabs.includes(tab)) continue;
    const gid = gidByTitle.get(tab);
    if (!gid) {
      throw new Error(`Could not resolve gid for tab "${tab}"`);
    }
    const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`CSV export failed for "${tab}": HTTP ${res.status}`);
    }
    const text = await res.text();
    const csvName = mapping.tabs[tab]!.csv;
    writeFileSync(join(cacheDir, csvName), text, "utf8");
    const { records } = rowsToObjects(parseCsv(text));
    for (let i = 0; i < records.length; i++) {
      rows.push({
        tab: tab as TabName,
        rowNumber: i + 2,
        cells: records[i]!,
      });
    }
  }
  return rows;
}

/** Optional service-account fetch (read-only Sheets scope). */
export async function fetchWithServiceAccount(
  mapping: SheetMapping,
  jsonEnv: string,
  cacheDir: string,
): Promise<RawRow[]> {
  mkdirSync(cacheDir, { recursive: true });
  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(jsonEnv) as {
      client_email: string;
      private_key: string;
    };
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error("Service account JSON missing client_email/private_key");
  }

  // Minimal JWT for Sheets API (no googleapis dependency)
  const token = await googleAccessToken(creds, [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]);
  const id = mapping.spreadsheet.id;
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    throw new Error(`Sheets API meta failed: HTTP ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as {
    sheets: { properties: { title: string; sheetId: number } }[];
  };
  const titleToGid = new Map(
    meta.sheets.map((s) => [s.properties.title, String(s.properties.sheetId)]),
  );

  const rows: RawRow[] = [];
  for (const tab of tabNames(mapping)) {
    if (mapping.spreadsheet.skipTabs.includes(tab)) continue;
    const range = encodeURIComponent(`${tab}`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      throw new Error(`Sheets values failed for "${tab}": HTTP ${res.status}`);
    }
    const body = (await res.json()) as { values?: string[][] };
    const values = (body.values ?? []).map((r) =>
      r.map((c) => (c == null ? "" : String(c))),
    );
    // Convert to CSV cache
    const csvName = mapping.tabs[tab]!.csv;
    const csvText = values
      .map((r) =>
        r
          .map((c) => {
            if (/[",\n\r]/.test(c)) return `"${c.replace(/"/g, '""')}"`;
            return c;
          })
          .join(","),
      )
      .join("\n");
    writeFileSync(join(cacheDir, csvName), csvText, "utf8");
    void titleToGid;
    const { records } = rowsToObjects(values);
    for (let i = 0; i < records.length; i++) {
      rows.push({
        tab: tab as TabName,
        rowNumber: i + 2,
        cells: records[i]!,
      });
    }
  }
  return rows;
}

async function googleAccessToken(
  creds: { client_email: string; private_key: string },
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  sign.end();
  const sig = sign
    .sign(creds.private_key.replace(/\\n/g, "\n"))
    .toString("base64url");
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function listLocalCsvDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".csv"));
}

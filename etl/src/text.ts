const CONTROL =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Strip HTML tags/entities and control/bidi chars; plain text only. */
export function sanitizePlainText(input: unknown, maxLen = 2000): string {
  if (input == null) return "";
  let s = String(input);
  s = s.replace(/<[^>]*>/g, " ");
  // Decode named/numeric entities once without producing re-parseable '&…;' sequences.
  // Replace &amp; last so we never double-unescape (&amp;lt; stays harmless after one pass).
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code) || code < 32 && code !== 9 && code !== 10) {
        return " ";
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return " ";
      }
    })
    .replace(/&amp;/gi, "&");
  s = s.replace(CONTROL, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function collapseName(name: string): string {
  return sanitizePlainText(name, 200).replace(/\s+/g, " ").trim();
}

/** Strip trailing "(snake_case_id)" from unit names; return [name, ieId|null]. */
export function stripEmbeddedId(name: string): {
  name: string;
  ieId: string | null;
} {
  const m = name.match(/^(.*?)\s*\(([a-z][a-z0-9_]{2,})\)\s*$/i);
  if (!m) return { name, ieId: null };
  return { name: m[1]!.trim(), ieId: m[2]! };
}

export function fingerprintCells(cells: Record<string, string>): string {
  const keys = Object.keys(cells).sort();
  return keys.map((k) => `${k}=${cells[k] ?? ""}`).join("\n");
}

/** Minimal RFC4180 CSV parser (UTF-8 text). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  while (i < s.length) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || (c === "\r" && s[i + 1] === "\n")) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += c === "\r" ? 2 : 1;
      continue;
    }
    if (c === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function rowsToObjects(
  matrix: string[][],
): { headers: string[]; records: Record<string, string>[] } {
  if (matrix.length === 0) return { headers: [], records: [] };
  const headers = matrix[0]!.map((h) => h.trim());
  const records: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r]!;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]!] = (line[c] ?? "").trim();
    }
    records.push(obj);
  }
  return { headers, records };
}

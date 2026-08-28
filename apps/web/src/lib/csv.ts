export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRows(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    return row;
  });
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? "" : String(cell);
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export function cell(row: Record<string, string>, ...names: string[]) {
  for (const name of names) {
    const direct = row[name];
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const found = Object.keys(row).find((key) => key.trim().toLowerCase() === name.toLowerCase());
    if (found && String(row[found]).trim()) return String(row[found]).trim();
  }
  return "";
}

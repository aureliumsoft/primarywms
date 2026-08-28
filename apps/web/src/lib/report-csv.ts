import { saveBlob } from "./download";
import { toCsv } from "./csv";

export function downloadRowsCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csv = toCsv([headers, ...rows]);
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

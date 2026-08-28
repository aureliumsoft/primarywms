export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadApi(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || res.statusText || "Download failed");
  }
  const blob = await res.blob();
  const header = res.headers.get("Content-Disposition") ?? "";
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : "download";
  saveBlob(blob, filename);
  return filename;
}

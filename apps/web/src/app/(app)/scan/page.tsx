"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { parseScannedCode } from "@/lib/scan-code";

export default function ScanRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const raw = params.get("v") || params.get("code") || params.get("scan") || "";
    const code = parseScannedCode(raw);
    if (!code) {
      router.replace("/items");
      return;
    }
    api<{ match: { href: string } | null }>(`/api/v1/barcodes?value=${encodeURIComponent(code)}`)
      .then((res) => {
        if (res.match?.href) router.replace(res.match.href);
        else router.replace(`/items?scan=${encodeURIComponent(code)}`);
      })
      .catch(() => router.replace(`/items?scan=${encodeURIComponent(code)}`));
  }, [params, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#8a9a93]">
      Opening scanned item…
    </div>
  );
}

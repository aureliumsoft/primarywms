"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { cn } from "@/lib/cn";

export function BarcodeMark({
  value,
  symbology,
  className,
  height = 56,
  showValue = true,
}: {
  value: string;
  symbology: string;
  className?: string;
  height?: number;
  showValue?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const isQr = !symbology || symbology === "QR" || symbology === "AZTEC" || symbology === "DATAMATRIX" || symbology === "PDF417";

  useEffect(() => {
    let cancelled = false;
    setError("");
    if (!value.trim()) {
      setQr("");
      return;
    }
    if (isQr) {
      QRCode.toString(value.trim(), {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#2a3a33", light: "#ffffff" },
      })
        .then((svg) => {
          if (!cancelled) setQr(svg);
        })
        .catch(() => {
          if (!cancelled) setError("Could not draw QR code");
        });
      return () => {
        cancelled = true;
      };
    }

    const format = jsBarcodeFormat(symbology);
    try {
      if (svgRef.current) {
        JsBarcode(svgRef.current, value.trim(), {
          format,
          displayValue: showValue,
          fontSize: 12,
          height,
          margin: 4,
          lineColor: "#2a3a33",
          background: "#ffffff",
          valid(ok) {
            if (!ok && !cancelled) setError("This value cannot be encoded as that barcode");
          },
        });
      }
    } catch {
      setError("Could not draw barcode");
    }
    return () => {
      cancelled = true;
    };
  }, [value, symbology, isQr, height, showValue]);

  if (!value.trim()) return null;
  if (error) {
    return <p className="text-[12px] text-[#e24b4b]">{error}</p>;
  }
  if (isQr) {
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        <div className="h-[88px] w-[88px] text-[#2a3a33]" dangerouslySetInnerHTML={{ __html: qr }} />
        {showValue ? <span className="font-mono text-[11px] tracking-wide text-[#4a5c54]">{value}</span> : null}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg ref={svgRef} />
    </div>
  );
}

function jsBarcodeFormat(symbology: string) {
  switch (symbology) {
    case "CODE39":
      return "CODE39";
    case "EAN13":
      return "EAN13";
    case "EAN8":
      return "EAN8";
    case "UPCE":
      return "UPC";
    case "CODE93":
      return "CODE93";
    case "I25":
      return "ITF";
    default:
      return "CODE128";
  }
}

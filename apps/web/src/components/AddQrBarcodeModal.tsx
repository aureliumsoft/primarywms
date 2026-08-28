"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Barcode, Camera, Pencil, QrCode, ScanBarcode, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { BarcodeMark } from "./BarcodeMark";

export type QrBarcodeChoice = "qr" | "barcode" | "link";

export type AddedQrBarcode = {
  value: string;
  symbology: string;
  role: "native" | "linked";
};

type LookupResponse = { match: { kind: string; id: string; name: string; href: string } | null; symbology: string };

export function AddQrBarcodeModal({
  open,
  startOnLink = false,
  existingSid,
  onClose,
  onAdd,
}: {
  open: boolean;
  startOnLink?: boolean;
  existingSid?: string;
  onClose: () => void;
  onAdd: (code: AddedQrBarcode) => void;
}) {
  const [choice, setChoice] = useState<QrBarcodeChoice | null>(null);
  const [step, setStep] = useState<"pick" | "link">("pick");
  const [linkValue, setLinkValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    setChoice(startOnLink ? "link" : null);
    setStep(startOnLink ? "link" : "pick");
    setLinkValue("");
    setPending(false);
    setError("");
    setCameraOn(false);
  }, [open, startOnLink]);

  useEffect(() => {
    if (!open || step !== "link") return;
    scanRef.current?.focus();
  }, [open, step]);

  useEffect(() => {
    if (!cameraOn || !open) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }
        if (!Detector) return;
        const detector = new Detector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "codabar", "itf"],
        });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            const value = found[0]?.rawValue?.trim();
            if (value) {
              setLinkValue(value);
              setCameraOn(false);
              return;
            }
          } catch {
            /* keep scanning */
          }
          requestAnimationFrame(() => void tick());
        };
        void tick();
      })
      .catch(() => {
        setError("Camera is not available. Use a USB scanner or type the code.");
        setCameraOn(false);
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOn, open]);

  if (!open) return null;

  async function confirmGenerated() {
    if (choice !== "qr" && choice !== "barcode") return;
    setPending(true);
    setError("");
    try {
      const sid = existingSid || (await api<{ sid: string }>("/api/v1/barcodes", { method: "POST", body: JSON.stringify({ action: "allocate" }) })).sid;
      onAdd({ value: sid, symbology: choice === "qr" ? "QR" : "CODE128", role: "native" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a unique code");
    } finally {
      setPending(false);
    }
  }

  async function confirmLink() {
    const value = linkValue.trim();
    if (!value) return;
    setPending(true);
    setError("");
    try {
      const res = await api<LookupResponse>(`/api/v1/barcodes?value=${encodeURIComponent(value)}`);
      if (res.match) {
        setError(`This code is already linked to ${res.match.name}`);
        return;
      }
      onAdd({ value, symbology: res.symbology, role: "linked" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link this code");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgb(16_24_20/0.2)]">
        <header className="flex items-center justify-between bg-[#f4f6f5] px-6 py-4">
          <h2 className="text-[18px] font-medium text-[#3d4f47]">
            {step === "link" ? "Link existing code using scanner" : "Add QR / Barcode"}
          </h2>
          <button type="button" onClick={onClose} className="text-[#9aa6a0] hover:text-[#3d4f47]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {step === "pick" ? (
          <>
            <div className="space-y-3 px-6 py-5">
              <ChoiceCard
                selected={choice === "qr"}
                title="Create New QR Code"
                hint="Create a unique QR code"
                onClick={() => setChoice("qr")}
                icon={
                  <span className="relative text-[#6b7c74]">
                    <QrCode className="h-9 w-9" strokeWidth={1.5} />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <Pencil className="h-3 w-3" />
                    </span>
                  </span>
                }
              />
              <ChoiceCard
                selected={choice === "barcode"}
                title="Create New Barcode"
                hint="Create a unique barcode"
                onClick={() => setChoice("barcode")}
                icon={
                  <span className="relative text-[#6b7c74]">
                    <Barcode className="h-9 w-9" strokeWidth={1.5} />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <Pencil className="h-3 w-3" />
                    </span>
                  </span>
                }
              />
              <ChoiceCard
                selected={choice === "link"}
                title="Link Existing"
                hint="Scan any QR code or barcode using scanner"
                onClick={() => setChoice("link")}
                icon={
                  <span className="text-[#6b7c74]">
                    <ScanBarcode className="h-9 w-9" strokeWidth={1.75} />
                  </span>
                }
              />
              {error ? <p className="text-sm text-[#e24b4b]">{error}</p> : null}
            </div>
            <footer className="flex justify-end px-6 pb-5">
              <button
                type="button"
                disabled={!choice || pending}
                onClick={() => {
                  if (choice === "link") {
                    setStep("link");
                    setError("");
                    return;
                  }
                  void confirmGenerated();
                }}
                className="rounded-md bg-primary px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:pointer-events-none disabled:bg-[#c5ddd2] disabled:text-white"
              >
                {pending ? "Adding…" : "Add"}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="px-6 py-8 text-center" onMouseDown={() => scanRef.current?.focus()}>
              {cameraOn ? (
                <video ref={videoRef} className="mx-auto h-[180px] w-full max-w-[320px] rounded-lg bg-black object-cover" muted playsInline />
              ) : (
                <ScannerIllustration />
              )}
              <p className="mt-5 text-[18px] font-semibold text-[#2a3a33]">Scanning mode is enabled</p>
              <p className="mt-1.5 text-[14px] text-[#8a9a93]">Scan any QR/Barcode using a 2D scanner, or use the camera</p>
              <div className="mt-3 flex items-center justify-center gap-4">
                <button type="button" onClick={() => setCameraOn((v) => !v)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
                  <Camera className="h-4 w-4" />
                  {cameraOn ? "Stop camera" : "Use camera"}
                </button>
                <a href="/help#linking-codes" target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-primary hover:underline">
                  Learn more
                </a>
              </div>
              {linkValue.trim() ? (
                <div className="mt-4">
                  <BarcodeMark value={linkValue.trim()} symbology="QR" height={40} />
                </div>
              ) : (
                <input
                  className="mt-4 h-11 w-full rounded-md border border-[#d8dfdb] px-3 text-center font-mono text-sm outline-none focus:border-primary"
                  placeholder="Or type / paste a code"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                />
              )}
              <input
                ref={scanRef}
                autoFocus
                aria-label="Scan QR or barcode"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onBlur={(e) => {
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next?.closest("a, button, input")) return;
                  scanRef.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmLink();
                  }
                }}
                className="sr-only"
              />
              {error ? <p className="mt-3 text-sm text-[#e24b4b]">{error}</p> : null}
            </div>
            <footer className="flex justify-end px-6 pb-5">
              <button
                type="button"
                disabled={!linkValue.trim() || pending}
                onClick={() => void confirmLink()}
                className="rounded-md bg-primary px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:pointer-events-none disabled:bg-[#c5ddd2] disabled:text-white"
              >
                {pending ? "Linking…" : "Link"}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ScannerIllustration() {
  return (
    <svg viewBox="0 0 200 130" className="mx-auto h-[110px] w-[170px]" aria-hidden>
      <g fill="none" stroke="#c5d0cb" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M62 46 L100 28 L138 46 L138 88 L100 106 L62 88 Z" />
        <path d="M62 46 L100 64 L138 46" />
        <path d="M100 64 L100 106" />
      </g>
      <g className="text-primary" fill="currentColor">
        <rect x="78" y="58" width="2" height="18" rx="0.5" />
        <rect x="82" y="58" width="1.4" height="18" rx="0.5" />
        <rect x="86" y="58" width="3" height="18" rx="0.5" />
        <rect x="91" y="58" width="1.4" height="18" rx="0.5" />
        <rect x="95" y="58" width="2.2" height="18" rx="0.5" />
        <rect x="99" y="58" width="1.4" height="18" rx="0.5" />
        <rect x="103" y="58" width="3" height="18" rx="0.5" />
        <rect x="108" y="58" width="1.4" height="18" rx="0.5" />
        <rect x="112" y="58" width="2" height="18" rx="0.5" />
      </g>
      <g fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M128 38 L158 22 L172 30 L148 50 Z" />
        <path d="M148 50 L138 72" />
        <rect x="132" y="70" width="18" height="10" rx="2" transform="rotate(-28 141 75)" />
        <path d="M126 42 L118 48" />
      </g>
    </svg>
  );
}

function ChoiceCard({
  selected,
  title,
  hint,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition",
        selected ? "border-primary ring-2 ring-primary/20" : "border-[#e6ebe8] hover:border-primary/40",
      )}
    >
      <span>
        <span className="block text-[15px] font-semibold text-[#2a3a33]">{title}</span>
        <span className="mt-0.5 block text-[13px] text-[#8a9a93]">{hint}</span>
      </span>
      {icon}
    </button>
  );
}

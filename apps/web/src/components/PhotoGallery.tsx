"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, GripVertical, Images, Pencil, Plus, Trash2, X } from "lucide-react";
import { MAX_PHOTOS } from "@primarywms/shared";
import { cn } from "@/lib/cn";

export type GalleryPhoto = { file: File; url: string };

export function PhotoGallery({
  photos,
  onAdd,
  onRemove,
  onReplace,
  onReorder,
}: {
  photos: GalleryPhoto[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number, file: File) => void;
  onReorder: (next: GalleryPhoto[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    if (active >= photos.length) setActive(Math.max(0, photos.length - 1));
  }, [photos.length, active]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActive((i) => (photos.length ? (i + photos.length - 1) % photos.length : 0));
      if (e.key === "ArrowRight") setActive((i) => (photos.length ? (i + 1) % photos.length : 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  const current = photos[active];

  function prev() {
    if (photos.length < 2) return;
    setActive((i) => (i + photos.length - 1) % photos.length);
  }
  function next() {
    if (photos.length < 2) return;
    setActive((i) => (i + 1) % photos.length);
  }

  function download(photo: GalleryPhoto) {
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.file.name || "photo.jpg";
    a.click();
  }

  function startReplace(index: number) {
    setReplaceIndex(index);
    replaceRef.current?.click();
  }

  function movePhoto(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    setActive(to);
  }

  function IconBtn({
    label,
    onClick,
    children,
  }: {
    label: string;
    onClick: () => void;
    children: ReactNode;
  }) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-black/55 text-white hover:bg-black/75"
      >
        {children}
      </button>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceIndex != null) onReplace(replaceIndex, file);
          setReplaceIndex(null);
          e.target.value = "";
        }}
      />

      {!photos.length ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onAdd(e.dataTransfer.files);
          }}
          className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-lg bg-[#f3f5f4] px-4 py-8 text-[#9aa6a0]"
        >
          <span className="relative mb-3 text-[#c5cdd0]">
            <Images className="h-14 w-14" strokeWidth={1.25} />
            <Plus className="absolute -bottom-0.5 -right-1 h-5 w-5" />
          </span>
          <span className="text-center text-[12px]">(Max {MAX_PHOTOS} photos, 30 MB total (JPG, PNG, HEIC))</span>
        </button>
      ) : (
        <>
          <div
            className="group relative overflow-hidden rounded-md bg-[#2c3330]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) onAdd(e.dataTransfer.files);
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-between px-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
              <IconBtn label="Replace photo" onClick={() => startReplace(active)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label="Delete photo"
                onClick={() => {
                  onRemove(active);
                  if (photos.length <= 1) setLightbox(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
            <button type="button" className="block w-full" onClick={() => setLightbox(true)}>
              <img src={current.url} alt="" className="mx-auto max-h-[320px] w-full object-contain" />
            </button>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={prev}
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/45 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/65"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={next}
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/45 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/65"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <button
                key={`${photo.url}-${i}`}
                type="button"
                draggable={photos.length > 1}
                aria-label={`Photo ${i + 1}`}
                onClick={() => {
                  if (draggedRef.current) return;
                  setActive(i);
                }}
                onDragStart={(e) => {
                  draggedRef.current = true;
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (dragIndex == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex != null) movePhoto(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  window.setTimeout(() => {
                    draggedRef.current = false;
                  }, 0);
                }}
                className={cn(
                  "group relative h-[72px] w-[72px] overflow-hidden rounded-lg border-2 bg-[#2c3330]",
                  i === active ? "border-[#3d4a45]" : "border-transparent hover:border-[#c5d0cb]",
                  dragIndex === i && "opacity-60",
                )}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                {photos.length > 1 ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3d4a45] text-white">
                      <GripVertical className="h-4 w-4" />
                    </span>
                  </span>
                ) : null}
              </button>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                aria-label="Add photo"
                onClick={() => fileRef.current?.click()}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-[#e8ecea] text-[#8a9a93] hover:bg-[#dde3e0]"
              >
                <span className="relative">
                  <Images className="h-7 w-7" strokeWidth={1.5} />
                  <Plus className="absolute -bottom-1 -right-1 h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </button>
            ) : null}
          </div>
        </>
      )}

      {lightbox && current ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6">
          <button type="button" className="absolute inset-0 cursor-zoom-out" aria-label="Close" onClick={() => setLightbox(false)} />
          <div className="relative z-10 max-h-[90vh] max-w-[min(960px,92vw)]">
            <div className="absolute right-3 top-3 z-20 flex gap-2">
              <IconBtn label="Replace photo" onClick={() => startReplace(active)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Download photo" onClick={() => download(current)}>
                <Download className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                label="Delete photo"
                onClick={() => {
                  onRemove(active);
                  if (photos.length <= 1) setLightbox(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Close" onClick={() => setLightbox(false)}>
                <X className="h-4 w-4" />
              </IconBtn>
            </div>
            <img src={current.url} alt="" className="max-h-[90vh] max-w-full rounded-md object-contain shadow-2xl" />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={prev}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={next}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#e6ebe8]", className)} />;
}

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3.5 rounded-full", className)} />;
}

export function CatalogSkeleton() {
  return (
    <div className="flex h-full min-h-0" aria-busy="true" aria-label="Loading inventory">
      <aside className="hidden w-[260px] shrink-0 border-r border-[#e6ebe8] bg-[#f7f8f8] p-4 md:block">
        <Skeleton className="mb-4 h-9 w-full rounded-md" />
        <Skeleton className="mb-3 h-8 w-full rounded-md" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2" style={{ paddingLeft: (i % 3) * 12 }}>
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <SkeletonLine className={cn("h-3", i % 2 ? "w-28" : "w-36")} />
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="border-b border-[#e6ebe8] px-6 pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SkeletonLine className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Skeleton className="h-9 min-w-[240px] flex-1 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="mt-4 flex gap-6">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        </header>
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CatalogCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function CatalogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border">
      <Skeleton className="h-[138px] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonLine className="h-4 w-[140px]" />
        <SkeletonLine className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white" aria-busy="true" aria-label="Loading item">
      <header className="border-b border-[#e6ebe8] px-6 py-5">
        <SkeletonLine className="mb-3 h-3 w-40" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-64" />
            <SkeletonLine className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </header>
      <div className="grid flex-1 gap-6 overflow-auto p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-16 w-16 rounded-lg" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#eef2f0] p-4">
                <SkeletonLine className="mb-2 h-3 w-16" />
                <SkeletonLine className="h-6 w-20" />
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-[#eef2f0] p-4">
            <SkeletonLine className="h-4 w-28" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-[90%]" />
            <SkeletonLine className="h-3 w-[65%]" />
          </div>
          <div className="space-y-3 rounded-xl border border-[#eef2f0] p-4">
            <SkeletonLine className="mb-2 h-4 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1">
                <SkeletonLine className="h-3 w-40" />
                <SkeletonLine className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobsSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-auto" aria-busy="true" aria-label="Loading jobs">
      <div className="sticky top-0 z-10 grid grid-cols-7 gap-4 border-b border-[#eef2f0] bg-[#f7f8f8] px-8 py-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonLine key={i} className="h-2.5 w-16" />
        ))}
      </div>
      <div className="divide-y divide-[#eef2f0]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 items-center gap-4 px-8 py-4">
            <SkeletonLine className="h-4 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef1ef]" aria-busy="true" aria-label="Loading grouped items">
      <header className="border-b border-[#e6ebe8] bg-white px-6 py-5">
        <SkeletonLine className="mb-3 h-3 w-40" />
        <SkeletonLine className="mb-2 h-8 w-56" />
        <SkeletonLine className="h-3 w-72" />
      </header>
      <div className="grid gap-3 overflow-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <SkeletonLine className="h-4 w-40" />
              <SkeletonLine className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <SkeletonLine className="h-3 w-12" />
            </div>
            <SkeletonLine className="mb-2 h-7 w-20" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonLine className="h-5 w-56" />
          <SkeletonLine className="h-3 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-3.5 w-48" />
                <SkeletonLine className="h-3 w-32" />
              </div>
              <SkeletonLine className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <SkeletonLine className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <SkeletonLine className="h-3 flex-1" />
              <SkeletonLine className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
          <SkeletonLine className="mb-3 h-4 w-24" />
          <SkeletonLine className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="max-w-lg space-y-4 p-6" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-28 rounded-md" />
    </div>
  );
}

export function AddFolderSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white" aria-busy="true" aria-label="Loading">
      <header className="flex items-center justify-between border-b border-[#e6ebe8] px-8 py-4">
        <SkeletonLine className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-8">
        <SkeletonLine className="h-8 w-72" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const AddItemSkeleton = AddFolderSkeleton;

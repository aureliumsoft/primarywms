"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMoney } from "@primarywms/shared";
import { api } from "@/lib/api";
import { GroupSkeleton } from "@/components/skeletons";

type Member = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  totalValue: number;
  updatedAt: string;
  unit?: { name: string; abbreviation: string };
  folder?: { id: string; name: string };
  photos: { id: string; publicUrl?: string | null }[];
};

type GroupPayload = {
  sid: string;
  name: string;
  groupedCount: number;
  groupedQty: number;
  totalValue: number;
  unit?: { name: string; abbreviation: string };
  members: Member[];
};

export default function SidGroupPage() {
  const params = useParams<{ sid: string }>();
  const sid = decodeURIComponent(params.sid);
  const [data, setData] = useState<GroupPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<GroupPayload>(`/api/v1/items/group?sid=${encodeURIComponent(sid)}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load grouped items"));
  }, [sid]);

  if (error) return <div className="p-8 text-danger">{error}</div>;
  if (!data) return <GroupSkeleton />;

  const unit = data.unit?.name?.toLowerCase() || data.unit?.abbreviation || "units";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef1ef]">
      <header className="border-b border-[#e6ebe8] bg-white px-6 py-5">
        <div className="text-[13px] text-[#8a9a93]">
          <Link href="/items" className="hover:text-primary">
            All Items
          </Link>
          <span> › Grouped · {data.sid}</span>
        </div>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#1c2b25]">{data.name}</h1>
        <p className="mt-1 text-[13px] text-[#8a9a93]">
          {data.groupedCount} location{data.groupedCount === 1 ? "" : "s"} with the same SID · {data.groupedQty} {unit} ·{" "}
          {formatMoney(data.totalValue)}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-3">
          {data.members.map((item) => {
            const photo = item.photos[0];
            const src = photo ? photo.publicUrl || `/api/v1/photos/${photo.id}` : null;
            return (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="flex min-h-[108px] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border hover:ring-primary"
              >
                <div className="w-[108px] shrink-0 bg-[#eceeed]">
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs font-semibold uppercase text-[#b7c2bd]">
                      {item.name}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
                  <div className="text-[13px] tracking-wide text-[#b7c2bd]">{item.sid}</div>
                  <div className="truncate text-[18px] font-semibold text-[#2a3a33]">{item.name}</div>
                  <div className="mt-1 text-[13px] text-[#8a9a93]">
                    {item.folder?.name ?? "Folder"} · {item.quantity} {item.unit?.abbreviation ?? "unit"}
                    <span className="text-[#c5d0cb]"> | </span>
                    {formatMoney(item.totalValue)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

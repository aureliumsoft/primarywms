"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui";
import { ListRowsSkeleton } from "@/components/skeletons";

export default function TrashPage() {
  const [items, setItems] = useState<{ id: string; name: string; deletedAt: string }[] | null>(null);
  function load() {
    api<{ items: NonNullable<typeof items> }>("/api/v1/trash").then((d) => setItems(d.items));
  }
  useEffect(load, []);
  return (
    <>
      <PageHeader title="Trash" />
      <div className="space-y-2 overflow-y-auto p-6">
        {items === null ? (
          <ListRowsSkeleton />
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                <div>
                  {item.name}
                  <div className="text-xs text-muted-foreground">Deleted {item.deletedAt}</div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await api("/api/v1/trash", { method: "POST", body: JSON.stringify({ itemId: item.id }) });
                    load();
                  }}
                >
                  Restore
                </Button>
              </div>
            ))}
            {items.length === 0 ? <p className="text-muted-foreground">Trash is empty.</p> : null}
          </>
        )}
      </div>
    </>
  );
}

"use client";

import { Suspense } from "react";
import { AddItemFullPage } from "@/components/AddItemFullPage";
import { AddItemSkeleton } from "@/components/skeletons";

export default function AddItemRoute() {
  return (
    <Suspense fallback={<AddItemSkeleton />}>
      <AddItemFullPage />
    </Suspense>
  );
}

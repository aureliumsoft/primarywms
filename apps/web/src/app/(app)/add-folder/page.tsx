"use client";

import { Suspense } from "react";
import { AddFolderFullPage } from "@/components/AddFolderFullPage";
import { AddFolderSkeleton } from "@/components/skeletons";

export default function AddFolderRoute() {
  return (
    <Suspense fallback={<AddFolderSkeleton />}>
      <AddFolderFullPage />
    </Suspense>
  );
}

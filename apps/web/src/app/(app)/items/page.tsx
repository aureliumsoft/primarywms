import { Suspense } from "react";
import { CatalogWorkspace } from "@/components/CatalogWorkspace";
import { CatalogSkeleton } from "@/components/skeletons";

export default function ItemsPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogWorkspace />
    </Suspense>
  );
}

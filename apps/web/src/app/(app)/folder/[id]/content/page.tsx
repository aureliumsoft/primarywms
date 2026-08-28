import { Suspense } from "react";
import { CatalogWorkspace } from "@/components/CatalogWorkspace";
import { CatalogSkeleton } from "@/components/skeletons";

export default async function FolderContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogWorkspace folderId={id} />
    </Suspense>
  );
}

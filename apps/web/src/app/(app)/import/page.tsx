"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/AppShell";
import { ImportWizard } from "@/components/ImportWizard";

export default function ImportPage() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId") ?? undefined;

  return (
    <>
      <PageHeader
        title="Bulk Import"
        crumbs={
          <p className="mb-0.5 text-[13px] text-[#8a9a93]">
            <Link href="/items" className="hover:text-primary">
              All Items
            </Link>
            <span className="mx-1.5">›</span>
            Bulk Import
          </p>
        }
      />
      <div className="overflow-y-auto p-6">
        <ImportWizard layout="page" defaultFolderId={folderId} />
      </div>
    </>
  );
}

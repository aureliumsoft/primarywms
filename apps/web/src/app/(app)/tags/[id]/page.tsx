"use client";

import { useParams } from "next/navigation";
import { TagsWorkspace } from "@/components/TagsWorkspace";

export default function TagDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TagsWorkspace tagId={id} />;
}

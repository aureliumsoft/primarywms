"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { api, toast } from "@/lib/api";
import type { CustomFieldDef } from "@/lib/custom-field-values";
import { FolderMenuItem } from "./FolderCard";
import type { TreeFolder } from "./FolderPane";
import { FolderCardMenu, type FolderMenuAction } from "@/components/folders/FolderCardMenu";
import {
  DeleteFolderModal,
  EditFolderModal,
  MoveFolderModal,
  PermissionsModal,
  SetAlertModal,
} from "@/components/folders/FolderModals";

type Dialog = "edit" | "move" | "alert" | "permissions" | "delete" | null;

export function FolderSidebarActionMenu({
  folder,
  tree,
  rootId,
  fields,
  onCreateLabel,
  onClone,
  onExport,
  onChanged,
  onDeleted,
  onClose,
}: {
  folder: TreeFolder;
  tree: TreeFolder[];
  rootId: string;
  fields: CustomFieldDef[];
  onCreateLabel: () => void;
  onClone?: () => void;
  onExport?: () => void;
  onChanged: () => void;
  onDeleted?: (folderId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const isJob = folder.kind === "JOB";
  const completed = isJob && folder.jobStatus === "COMPLETED";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  function handleAction(action: FolderMenuAction) {
    if (action === "edit") setDialog("edit");
    else if (action === "move") setDialog("move");
    else if (action === "alert") setDialog("alert");
    else if (action === "create-label") onCreateLabel();
    else if (action === "export") onExport?.();
    else if (action === "clone") onClone?.();
    else if (action === "permissions") setDialog("permissions");
    else if (action === "delete") setDialog("delete");
  }

  async function setJobLifecycle(action: "complete" | "reopen") {
    onClose();
    if (!folder.jobId) {
      toast.info("Open this job from Workflows → Jobs to manage its status.");
      return;
    }
    try {
      if (action === "complete") {
        await api(`/api/v1/jobs/${folder.jobId}/complete`, {
          method: "POST",
          body: JSON.stringify({ leftover: "leave" }),
        });
      } else {
        await api(`/api/v1/jobs/${folder.jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update job");
    }
  }

  const jobExtras =
    isJob && folder.jobId ? (
      completed ? (
        <FolderMenuItem icon={<RotateCcw className="h-4 w-4" />} onClick={() => void setJobLifecycle("reopen")}>
          Reopen job
        </FolderMenuItem>
      ) : (
        <FolderMenuItem icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void setJobLifecycle("complete")}>
          Mark job completed
        </FolderMenuItem>
      )
    ) : null;

  return (
    <>
      <div ref={ref}>
        <FolderCardMenu
          folderId={folder.id}
          variant="header"
          className="absolute right-2 top-full z-50 mt-0.5 w-[220px] rounded-lg border border-[#e6ebe8] bg-white py-1 text-sm shadow-[0_8px_24px_rgb(16_24_20/0.14)]"
          onClose={onClose}
          onAction={handleAction}
          afterAction={jobExtras ? { action: "clone", node: jobExtras } : undefined}
        />
      </div>

      {dialog === "edit" ? (
        <EditFolderModal
          folderId={folder.id}
          initialName={folder.name}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onChanged();
          }}
        />
      ) : null}
      {dialog === "move" ? (
        <MoveFolderModal
          folderId={folder.id}
          folderName={folder.name}
          parentId={folder.parentId || rootId}
          tree={tree}
          rootId={rootId}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onChanged();
          }}
        />
      ) : null}
      {dialog === "alert" ? (
        <SetAlertModal folderId={folder.id} folderName={folder.name} fields={fields} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "permissions" ? (
        <PermissionsModal folderId={folder.id} folderName={folder.name} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "delete" ? (
        <DeleteFolderModal
          folderName={folder.name}
          onClose={() => setDialog(null)}
          onConfirm={async (meta) => {
            await api(`/api/v1/folders/${folder.id}`, {
              method: "DELETE",
              body: JSON.stringify({ reason: meta.reason || null, note: meta.note || null }),
              toast: "Folder moved to Trash",
            });
            setDialog(null);
            onDeleted?.(folder.id);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

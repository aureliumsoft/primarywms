type Node = { id: string; parentId: string | null; name: string };

export function ancestors(folders: Node[], folderId: string | null): Node[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Node[] = [];
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** `folderId` plus every nested child. */
export function subtreeIds(folders: { id: string; parentId: string | null }[], folderId: string) {
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

export function pathColumns(folders: Node[], folderId: string | null, rootId?: string) {
  const path = ancestors(folders, folderId).filter((node) => node.id !== rootId);
  return {
    primary: path[0]?.name ?? "",
    level1: path[1]?.name ?? "",
    level2: path[2]?.name ?? "",
    level3: path[3]?.name ?? "",
    level4: path[4]?.name ?? "",
  };
}

export const ADD_FOLDER_DRAFT_KEY = "pwms.addFolder.draft";

export type AddFolderDraft = {
  name: string;
  notes: string;
  tags: string[];
  destId: string;
  custom: Record<string, string>;
  returnTo: string;
};

export function saveAddFolderDraft(draft: AddFolderDraft) {
  window.sessionStorage.setItem(ADD_FOLDER_DRAFT_KEY, JSON.stringify(draft));
}

export function readAddFolderDraft(): AddFolderDraft | null {
  try {
    const raw = window.sessionStorage.getItem(ADD_FOLDER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AddFolderDraft;
  } catch {
    return null;
  }
}

export function clearAddFolderDraft() {
  window.sessionStorage.removeItem(ADD_FOLDER_DRAFT_KEY);
}

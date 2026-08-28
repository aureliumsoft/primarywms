export const ADD_ITEM_DRAFT_KEY = "pwms.addItem.draft";

export type AddItemDraft = {
  name: string;
  quantity: string;
  unitId: string;
  minQuantity: string;
  price: string;
  notes: string;
  productLink: string;
  tags: string[];
  destId: string;
  custom: Record<string, string>;
  variantsEnabled: boolean;
  returnTo: string;
};

export function saveAddItemDraft(draft: AddItemDraft) {
  window.sessionStorage.setItem(ADD_ITEM_DRAFT_KEY, JSON.stringify(draft));
}

export function readAddItemDraft(): AddItemDraft | null {
  try {
    const raw = window.sessionStorage.getItem(ADD_ITEM_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AddItemDraft;
  } catch {
    return null;
  }
}

export function clearAddItemDraft() {
  window.sessionStorage.removeItem(ADD_ITEM_DRAFT_KEY);
}

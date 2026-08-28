export type ItemActionTarget = {
  id: string;
  name: string;
  sid: string;
  quantity: number;
  minQuantity?: number | null;
  price?: number | null;
  totalValue?: number;
  productLink?: string | null;
  folderId?: string;
  lastFromFolderId?: string | null;
  unit?: { abbreviation: string; name: string };
};

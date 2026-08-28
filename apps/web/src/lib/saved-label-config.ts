import type { LabelKind, PaperId } from "./label-sizes";

export type SavedLabelConfig = {
  kind: LabelKind;
  paper: PaperId;
  sizeId: string;
  includeDetails: boolean;
  detailKey: string;
  includePhoto: boolean;
  includeLogo: boolean;
  includeNote: boolean;
  note: string;
  qtyMode: "one" | "custom" | "on_hand";
  customAmount: string;
  startOn: boolean;
  startPosition: number;
  instructions: boolean;
};

export type SavedLabelRow = {
  id: string;
  name: string;
  codeValue: string;
  kind: string;
  sizeId: string;
  config: SavedLabelConfig;
  createdAt: string;
  itemId?: string | null;
  folderId?: string | null;
};

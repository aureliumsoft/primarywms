import { printLabels } from "./label-print";
import { getLabelSize } from "./label-sizes";
import type { SavedLabelConfig } from "./saved-label-config";

export async function reprintSavedLabel(input: {
  name: string;
  codeValue: string;
  kind: string;
  sizeId: string;
  config: SavedLabelConfig;
  photoUrl?: string | null;
  logo?: string | null;
}) {
  const size = getLabelSize(input.sizeId);
  if (!size) throw new Error("Saved label size is no longer available");
  const kind = (input.kind === "BARCODE" ? "BARCODE" : "QR") as "QR" | "BARCODE";
  const copy: { name: string; value: string; extra?: string; note?: string; photoUrl?: string | null; logo?: string | null } = {
    name: input.name,
    value: input.codeValue,
    note: input.config.includeNote ? input.config.note.trim() || undefined : undefined,
    photoUrl: input.config.includePhoto ? input.photoUrl ?? null : null,
    logo: input.config.includeLogo ? input.logo ?? null : null,
  };
  await printLabels({
    size,
    kind,
    copies: [copy],
    startPosition: input.config.startOn ? input.config.startPosition : 1,
    instructions: input.config.instructions,
    includePhoto: input.config.includePhoto && size.photo,
    includeLogo: input.config.includeLogo,
  });
}

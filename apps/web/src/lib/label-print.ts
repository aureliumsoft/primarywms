/**
 * @deprecated Prefer buildLabelPdf / openPdfBytes / downloadPdfBytes from ./label-pdf.
 * Kept as a thin wrapper so older call sites still produce a real PDF.
 */
import { buildLabelPdf, openPdfBytes, type LabelPdfCopy } from "./label-pdf";
import type { LabelKind, LabelSize } from "./label-sizes";

export type PrintLabelCopy = LabelPdfCopy;

export type PrintSpec = {
  size: LabelSize;
  kind: LabelKind;
  copies: PrintLabelCopy[];
  startPosition: number;
  instructions: boolean;
  includePhoto: boolean;
  includeLogo: boolean;
  includeDetails?: boolean;
  includeNote?: boolean;
};

export async function printLabels(spec: PrintSpec) {
  const bytes = await buildLabelPdf({
    size: spec.size,
    kind: spec.kind,
    copies: spec.copies,
    startPosition: spec.startPosition,
    instructions: spec.instructions,
    includePhoto: spec.includePhoto,
    includeLogo: spec.includeLogo,
    includeDetails: spec.includeDetails ?? true,
    includeNote: spec.includeNote ?? true,
  });
  openPdfBytes(bytes);
}

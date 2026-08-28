import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createItem } from "@/lib/inventory";
import { prisma } from "@/lib/db";
import { customValueInputSchema } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";

const itemSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number(),
  unitId: z.string().uuid(),
  minQuantity: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  productLink: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customValues: z.array(customValueInputSchema).optional(),
  sid: z.string().min(8).optional(),
  nativeSymbology: z.enum(["QR", "CODE128", "CODE39", "EAN13", "EAN8", "UPCE", "CODE93", "I25", "PDF417", "AZTEC", "DATAMATRIX"]).optional(),
  barcodes: z
    .array(
      z.object({
        value: z.string().min(1),
        symbology: z.string().optional(),
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, itemSchema);
    const item = await createItem(user, body);
    return ok({ item }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      const units = await prisma.unit.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } });
      const fields = await prisma.customField.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { sortOrder: "asc" },
      });
      return ok({ units, fields });
    }
    const item = await prisma.item.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        unit: true,
        folder: true,
        photos: { orderBy: { sortOrder: "asc" } },
        barcodes: true,
        tags: { include: { tag: true } },
        customValues: { include: { field: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!item) return handleError(new Error("NOT_FOUND"));
    return ok({ item });
  } catch (error) {
    return handleError(error);
  }
}

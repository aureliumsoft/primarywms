import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  allocateUniqueSid,
  guessSymbology,
  linkOwnerBarcode,
  lookupCode,
  setNativeSymbology,
  unlinkExtraBarcode,
} from "@/lib/barcodes";
import { fail, handleError, ok, readJson } from "@/lib/http";
import type { BarcodeSymbology } from "@primarywms/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const value = request.nextUrl.searchParams.get("value")?.trim();
    if (!value) return fail("Scan or enter a code", 400);
    const match = await lookupCode(user, value);
    return ok({ match, symbology: guessSymbology(value) });
  } catch (error) {
    return handleError(error);
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("allocate") }),
  z.object({
    action: z.literal("link"),
    itemId: z.string().uuid().optional(),
    folderId: z.string().uuid().optional(),
    value: z.string().min(1),
    symbology: z.string().optional(),
  }),
  z.object({
    action: z.literal("native"),
    itemId: z.string().uuid().optional(),
    folderId: z.string().uuid().optional(),
    symbology: z.enum(["QR", "CODE128", "CODE39", "EAN13", "EAN8", "UPCE", "CODE93", "I25", "PDF417", "AZTEC", "DATAMATRIX"]),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, postSchema);
    if (body.action === "allocate") {
      const sid = await allocateUniqueSid(user.organizationId);
      return ok({ sid }, 201);
    }
    if (body.action === "native") {
      if (!body.itemId && !body.folderId) return fail("Choose an item or folder");
      const row = await setNativeSymbology(
        user,
        body.itemId ? { itemId: body.itemId } : { folderId: body.folderId! },
        body.symbology as BarcodeSymbology,
      );
      return ok({ barcode: row });
    }
    if (!body.itemId && !body.folderId) return fail("Choose an item or folder");
    const barcode = await linkOwnerBarcode(
      user,
      body.itemId ? { itemId: body.itemId } : { folderId: body.folderId! },
      { value: body.value, symbology: body.symbology },
    );
    return ok({ barcode }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return fail("Missing id");
    await unlinkExtraBarcode(user, id);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

import { NextRequest } from "next/server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";

import { createUnlinkedLabels, emailLabelCopy, listSavedLabels, listUnlinkedLabels, saveLinkedLabel } from "@/lib/labels";

import { fail, handleError, ok, readJson } from "@/lib/http";

import type { BarcodeSymbology } from "@primarywms/db";

import type { SavedLabelConfig } from "@/lib/saved-label-config";



export async function GET(request: NextRequest) {

  try {

    const user = await requireUser();

    const itemId = request.nextUrl.searchParams.get("itemId")?.trim();

    const folderId = request.nextUrl.searchParams.get("folderId")?.trim();

    if (itemId || folderId) {

      const saved = await listSavedLabels(user, { itemId: itemId || undefined, folderId: folderId || undefined });

      return ok({ saved });

    }

    const labels = await listUnlinkedLabels(user);

    return ok({ labels });

  } catch (error) {

    return handleError(error);

  }

}



const savedConfigSchema = z.object({

  kind: z.enum(["QR", "BARCODE"]),

  paper: z.enum(["US_LETTER", "A4", "THERMAL"]),

  sizeId: z.string().min(1),

  includeDetails: z.boolean(),

  detailKey: z.string(),

  includePhoto: z.boolean(),

  includeLogo: z.boolean(),

  includeNote: z.boolean(),

  note: z.string(),

  qtyMode: z.enum(["one", "custom", "on_hand"]),

  customAmount: z.string(),

  startOn: z.boolean(),

  startPosition: z.number().int().min(1),

  instructions: z.boolean(),

});



const postSchema = z.discriminatedUnion("action", [

  z.object({

    action: z.literal("unlinked"),

    name: z.string().min(1).max(120),

    count: z.number().int().min(1).max(1500),

    symbology: z.literal("QR"),

  }),

  z.object({

    action: z.literal("email"),

    email: z.string().email(),

    summary: z.string().max(4000).optional(),

  }),

  z.object({

    action: z.literal("linked"),

    itemId: z.string().uuid().optional(),

    folderId: z.string().uuid().optional(),

    name: z.string().min(1).max(200),

    codeValue: z.string().min(1).max(200),

    kind: z.enum(["QR", "BARCODE"]),

    sizeId: z.string().min(1),

    config: savedConfigSchema,

  }),

]);



export async function POST(request: NextRequest) {

  try {

    const user = await requireUser();

    const body = await readJson(request, postSchema);

    if (body.action === "email") {

      await emailLabelCopy(user, body.email, body.summary ?? "Labels were generated from Primary WMS.");

      return ok({ sent: true });

    }

    if (body.action === "linked") {

      const saved = await saveLinkedLabel(user, {

        itemId: body.itemId,

        folderId: body.folderId,

        name: body.name,

        codeValue: body.codeValue,

        kind: body.kind,

        sizeId: body.sizeId,

        config: body.config as SavedLabelConfig,

      });

      return ok({ saved }, 201);

    }

    const labels = await createUnlinkedLabels(user, {

      name: body.name,

      count: body.count,

      symbology: body.symbology as BarcodeSymbology,

    });

    return ok({ labels }, 201);

  } catch (error) {

    return handleError(error);

  }

}


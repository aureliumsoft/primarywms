import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addItemToWorkflow } from "@/lib/item-workflows";
import { fail, handleError, ok, readJson } from "@/lib/http";

const bodySchema = z.object({
  kind: z.enum(["pick-list", "purchase-order", "stock-count"]),
  documentId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, bodySchema);
    const result = await addItemToWorkflow(user, id, body);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return fail(error.message, 404);
    return handleError(error);
  }
}

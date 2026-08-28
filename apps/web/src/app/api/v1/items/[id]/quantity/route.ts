import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { serializeItem, updateQuantity } from "@/lib/inventory";
import { handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  newQuantity: z.number(),
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  mode: z.enum(["SET", "ADD", "SUBTRACT"]).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const item = await updateQuantity(user, { itemId: id, ...body });
    return ok({ item: serializeItem(item) });
  } catch (error) {
    return handleError(error);
  }
}

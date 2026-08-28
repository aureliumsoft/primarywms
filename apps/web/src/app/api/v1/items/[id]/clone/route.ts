import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { cloneItem } from "@/lib/inventory";
import { handleError, ok, readJson } from "@/lib/http";

const schema = z.object({
  name: z.string().optional(),
  count: z.number().int().min(1).max(30).optional(),
  newSid: z.boolean().optional(),
  folderId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const items = await cloneItem(user, { itemId: id, ...body });
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

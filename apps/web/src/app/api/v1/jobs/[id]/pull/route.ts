import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { pullItemToJob } from "@/lib/jobs";

const schema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const result = await pullItemToJob(user, id, body);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

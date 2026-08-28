import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { mergeCandidates, mergeItems } from "@/lib/merge";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = await mergeCandidates(user, id);
    return ok({
      item: { id: data.item.id, name: data.item.name, sid: data.item.sid, quantity: Number(data.item.quantity) },
      others: data.others.map((row) => ({
        id: row.id,
        name: row.name,
        sid: row.sid,
        quantity: Number(row.quantity),
        notes: row.notes,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, z.object({ survivorId: z.string().uuid() }));
    const result = await mergeItems(user, id, body.survivorId);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

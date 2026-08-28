import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { cloneFolder } from "@/lib/inventory";
import { handleError, ok } from "@/lib/http";

const schema = z.object({
  includeContents: z.boolean().optional(),
  name: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const text = await request.text();
    const body = text ? schema.parse(JSON.parse(text)) : {};
    const folder = await cloneFolder(user, id, body);
    return ok({ folder }, 201);
  } catch (error) {
    return handleError(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { completeJob } from "@/lib/jobs";

const schema = z.object({
  leftover: z.enum(["return", "consume", "leave"]).default("leave"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const job = await completeJob(user, id, body.leftover);
    return ok({ job });
  } catch (error) {
    return handleError(error);
  }
}

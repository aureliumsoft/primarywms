import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleError, ok, readJson } from "@/lib/http";
import { getJob, updateJob } from "@/lib/jobs";

const patchSchema = z.object({
  number: z.string().min(1).max(120).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  externalLink: z.string().max(2000).optional().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS"]).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const job = await getJob(user, id);
    return ok({ job });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, patchSchema);
    const job = await updateJob(user, id, body);
    return ok({ job });
  } catch (error) {
    return handleError(error);
  }
}

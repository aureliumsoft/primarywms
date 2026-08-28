import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { customValueInputSchema } from "@/lib/custom-fields";
import { handleError, ok, readJson } from "@/lib/http";
import { createJob, listJobs } from "@/lib/jobs";

const createSchema = z.object({
  number: z.string().min(1).max(120).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  externalLink: z.string().max(2000).optional().nullable(),
  customValues: z.array(customValueInputSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sp = request.nextUrl.searchParams;
    const jobs = await listJobs(user, {
      includeCompleted: sp.get("completed") === "1" || sp.get("completed") === "true",
      q: sp.get("q") ?? undefined,
    });
    return ok({ jobs });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson(request, createSchema);
    const job = await createJob(user, body);
    return ok({ job }, 201);
  } catch (error) {
    return handleError(error);
  }
}

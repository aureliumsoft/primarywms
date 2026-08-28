import { requireUser } from "@/lib/auth";
import { listDraftWorkflows } from "@/lib/item-workflows";
import { handleError, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listDraftWorkflows(user));
  } catch (error) {
    return handleError(error);
  }
}

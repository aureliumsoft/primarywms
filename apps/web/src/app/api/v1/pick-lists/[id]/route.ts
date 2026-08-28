import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getPickList } from "@/lib/pick-lists";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const pickList = await getPickList(user, id);
    return ok({ pickList });
  } catch (error) {
    return handleError(error);
  }
}

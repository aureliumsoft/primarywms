import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getStockCount } from "@/lib/stock-counts";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const stockCount = await getStockCount(user, id);
    return ok({ stockCount });
  } catch (error) {
    return handleError(error);
  }
}

import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const purchaseOrder = await getPurchaseOrder(user, id);
    return ok({ purchaseOrder });
  } catch (error) {
    return handleError(error);
  }
}

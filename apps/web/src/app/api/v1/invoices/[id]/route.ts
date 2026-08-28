import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getInvoice } from "@/lib/invoices";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const invoice = await getInvoice(user, id);
    return ok({ invoice });
  } catch (error) {
    return handleError(error);
  }
}

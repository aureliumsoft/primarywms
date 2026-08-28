import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getItemOrders } from "@/lib/item-workflows";
import { handleError, ok } from "@/lib/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok(await getItemOrders(user, id));
  } catch (error) {
    return handleError(error);
  }
}

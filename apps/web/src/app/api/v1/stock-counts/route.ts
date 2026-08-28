import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createStockCount, listStockCounts } from "@/lib/stock-counts";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const sp = request.nextUrl.searchParams;
    const data = await listStockCounts(user, {
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      page: Number(sp.get("page") || 1),
      pageSize: Number(sp.get("pageSize") || 20),
    });
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const stockCount = await createStockCount(user);
    return ok({ stockCount }, 201);
  } catch (error) {
    return handleError(error);
  }
}

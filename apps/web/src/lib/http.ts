import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Prisma } from "@primarywms/db";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function fileResponse(
  bytes: Buffer | Uint8Array | ArrayBuffer | string,
  filename: string,
  mime: string,
  disposition: "attachment" | "inline" = "attachment",
) {
  const body = typeof bytes === "string" ? bytes : new Uint8Array(bytes as Buffer | Uint8Array | ArrayBuffer);
  const safeName = filename.replace(/"/g, "");
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
    },
  });
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => null);
  return schema.parse(body);
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message ?? "Invalid input", 422, { issues: error.issues });
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return fail("Please sign in", 401);
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return fail("You do not have permission to do that", 403);
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return fail("Not found", 404);
  }
  console.error(error);
  if (error instanceof Prisma.PrismaClientValidationError) {
    return fail("Could not save. Please try again.", 500);
  }
  return fail(error instanceof Error ? error.message : "Something went wrong", 500);
}

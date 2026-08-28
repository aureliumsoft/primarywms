import { Prisma } from "@primarywms/db";
import { prisma } from "./db";

function isDatabaseUnavailable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2021: table does not exist (schema not pushed yet)
    // P1001/P1017: database unreachable during build or cold start
    return error.code === "P2021" || error.code === "P1001" || error.code === "P1017";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}

export async function getOrganization() {
  try {
    return await prisma.organization.findFirst();
  } catch (error) {
    if (isDatabaseUnavailable(error)) return null;
    throw error;
  }
}

export async function isSetupComplete() {
  try {
    const org = await prisma.organization.findFirst({
      select: { id: true, setupCompletedAt: true },
    });
    return Boolean(org?.setupCompletedAt);
  } catch (error) {
    if (isDatabaseUnavailable(error)) return false;
    throw error;
  }
}

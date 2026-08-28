import { prisma } from "./db";

export async function getOrganization() {
  return prisma.organization.findFirst();
}

export async function isSetupComplete() {
  const org = await prisma.organization.findFirst({
    select: { id: true, setupCompletedAt: true },
  });
  return Boolean(org?.setupCompletedAt);
}

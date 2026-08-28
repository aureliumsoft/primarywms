import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureSystemCustomFields } from "@/lib/custom-fields";
import { handleError, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    await ensureSystemCustomFields(user.organizationId);
    const [units, reasons, fields, members, roles, org] = await Promise.all([
      prisma.unit.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.transactionReason.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } }),
      prisma.customField.findMany({ where: { organizationId: user.organizationId }, orderBy: { sortOrder: "asc" } }),
      prisma.user.findMany({
        where: { organizationId: user.organizationId, status: { not: "DEACTIVATED" } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          role: { select: { id: true, name: true, kind: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.role.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          name: true,
          kind: true,
          _count: { select: { users: { where: { status: { not: "DEACTIVATED" } } } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.organization.findFirst({
        where: { id: user.organizationId },
        select: { timezone: true },
      }),
    ]);
    return ok({
      units,
      reasons,
      fields,
      members,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        kind: role.kind,
        memberCount: role._count.users,
      })),
      me: { id: user.id, firstName: user.firstName, lastName: user.lastName },
      timezone: org?.timezone ?? "Europe/London",
    });
  } catch (error) {
    return handleError(error);
  }
}

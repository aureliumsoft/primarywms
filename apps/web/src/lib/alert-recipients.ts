import type { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import { isRecipientToken, parseRecipientTokens } from "./alert-recipient-selection";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function resolveAlertRecipients(
  tx: Tx,
  organizationId: string,
  kind: string,
  ids: string[],
  createdById: string | null,
) {
  const tokens = ids.filter(Boolean);
  if (tokens.some(isRecipientToken)) {
    return resolveFromTokens(tx, organizationId, tokens, createdById);
  }
  return resolveLegacy(tx, organizationId, kind, tokens, createdById);
}

async function resolveFromTokens(tx: Tx, organizationId: string, ids: string[], createdById: string | null) {
  const parsed = parseRecipientTokens(ids);
  const userIds = new Set<string>();
  if (parsed.self && createdById) userIds.add(createdById);
  for (const id of parsed.userIds) userIds.add(id);

  const kindFilters: Prisma.RoleWhereInput[] = [];
  if (parsed.kinds.has("SUPER_ADMIN")) kindFilters.push({ kind: "SUPER_ADMIN" });
  if (parsed.kinds.has("ADMIN")) kindFilters.push({ kind: "ADMIN" });
  if (parsed.kinds.has("TEAM_MEMBER")) kindFilters.push({ kind: "TEAM_MEMBER" });
  if (parsed.kinds.has("SCANNER")) kindFilters.push({ kind: "SCANNER" });
  if (parsed.kinds.has("CUSTOM")) kindFilters.push({ kind: "CUSTOM" });
  if (parsed.roleIds.length) kindFilters.push({ id: { in: parsed.roleIds } });

  if (kindFilters.length) {
    const users = await tx.user.findMany({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "PENDING"] },
        role: { OR: kindFilters },
      },
      select: { id: true },
    });
    for (const row of users) userIds.add(row.id);
  }

  return [...userIds];
}

async function resolveLegacy(
  tx: Tx,
  organizationId: string,
  kind: string,
  ids: string[],
  createdById: string | null,
) {
  if (kind === "SELF" && createdById) return [createdById];
  if (kind === "PEOPLE") return ids;
  if (kind === "CUSTOM_ROLES") {
    const users = await tx.user.findMany({
      where: { organizationId, status: { in: ["ACTIVE", "PENDING"] }, role: { kind: "CUSTOM" } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  const users = await tx.user.findMany({
    where: {
      organizationId,
      status: { in: ["ACTIVE", "PENDING"] },
      ...(kind === "SUPER_ADMINS" ? { role: { kind: "SUPER_ADMIN" } } : {}),
      ...(kind === "ADMINS" ? { role: { kind: "ADMIN" } } : {}),
      ...(kind === "TEAM_MEMBERS" ? { role: { kind: "TEAM_MEMBER" } } : {}),
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

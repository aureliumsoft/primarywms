import argon2 from "argon2";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@primarywms/shared";
import type { FolderGrant, RoleKind, UserStatus } from "@primarywms/db";
import { prisma } from "./db";

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export function randomToken() {
  return randomBytes(32).toString("hex");
}

export type AuthUser = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  jobFunction: string | null;
  jobTitle: string | null;
  phone: string | null;
  roleId: string;
  role: {
    id: string;
    kind: RoleKind;
    name: string;
    permissions: Record<string, boolean>;
    hidePrices: boolean;
  };
  defaultView: "GRID" | "LIST" | "TABLE";
  defaultSort: string;
  sortDirection: "ASC" | "DESC";
  emailAlerts: boolean;
  poEmails: boolean;
  timezoneAuto: boolean;
  timezone: string | null;
  theme: "SYSTEM" | "LIGHT" | "DARK";
};

export async function createSession(userId: string, organizationId: string, meta?: { userAgent?: string; ip?: string }) {
  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  await prisma.session.create({
    data: {
      token,
      userId,
      organizationId,
      expiresAt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: { include: { role: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  const { user } = session;
  if (user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    jobFunction: user.jobFunction,
    jobTitle: user.jobTitle,
    phone: user.phone,
    status: user.status,
    roleId: user.roleId,
    role: {
      id: user.role.id,
      kind: user.role.kind,
      name: user.role.name,
      permissions: (user.role.permissions as Record<string, boolean>) ?? {},
      hidePrices: user.role.hidePrices,
    },
    defaultView: user.defaultView,
    defaultSort: user.defaultSort,
    sortDirection: user.sortDirection,
    emailAlerts: user.emailAlerts,
    poEmails: user.poEmails,
    timezoneAuto: user.timezoneAuto,
    timezone: user.timezone,
    theme: user.theme,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function displayName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export async function getFolderAccessMap(user: AuthUser) {
  if (user.role.kind === "SUPER_ADMIN" || user.role.kind === "ADMIN") {
    return "all" as const;
  }
  const [folders, acls] = await Promise.all([
    prisma.folder.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      select: { id: true, parentId: true },
    }),
    prisma.folderAcl.findMany({ where: { userId: user.id } }),
  ]);
  const aclMap = new Map(acls.map((a) => [a.folderId, a.grant]));
  const children = new Map<string | null, string[]>();
  for (const folder of folders) {
    const list = children.get(folder.parentId) ?? [];
    list.push(folder.id);
    children.set(folder.parentId, list);
  }
  const access = new Map<string, FolderGrant>();
  function walk(id: string, inherited: FolderGrant | null) {
    const own = aclMap.get(id) ?? inherited;
    if (own) access.set(id, own);
    for (const child of children.get(id) ?? []) walk(child, own);
  }
  for (const root of folders.filter((f) => !f.parentId)) walk(root.id, null);
  return access;
}

export async function assertFolderAccess(user: AuthUser, folderId: string, need: FolderGrant) {
  const access = await getFolderAccessMap(user);
  if (access === "all") return "EDIT" as FolderGrant;
  const grant = access.get(folderId);
  if (!grant) throw new Error("FORBIDDEN");
  if (need === "EDIT" && grant !== "EDIT") throw new Error("FORBIDDEN");
  return grant;
}

export function can(user: AuthUser, permission: string) {
  if (user.role.kind === "SUPER_ADMIN") return true;
  if (user.role.kind === "ADMIN" && permission !== "delete_org") return true;
  return Boolean(user.role.permissions[permission]);
}

export function assertCan(user: AuthUser, permission: string) {
  if (!can(user, permission)) throw new Error("FORBIDDEN");
}

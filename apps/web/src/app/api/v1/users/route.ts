import { NextRequest } from "next/server";
import { z } from "zod";
import { INVITE_TTL_DAYS } from "@primarywms/shared";
import { prisma } from "@/lib/db";
import { requireUser, assertCan, randomToken, hashPassword, createSession } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { fail, handleError, ok, readJson } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    assertCan(user, "manage_users");
    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "asc" },
        include: { role: true, folderAcls: { include: { folder: { select: { id: true, name: true } } } } },
      }),
      prisma.role.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } }),
    ]);
    return ok({
      users: users.map((u) => ({ ...u, passwordHash: undefined })),
      roles,
    });
  } catch (error) {
    return handleError(error);
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roleId: z.string().uuid(),
  folders: z.array(z.object({ folderId: z.string().uuid(), grant: z.enum(["VIEW", "EDIT"]) })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser();
    assertCan(actor, "manage_users");
    const body = await readJson(request, inviteSchema);
    const role = await prisma.role.findFirst({ where: { id: body.roleId, organizationId: actor.organizationId } });
    if (!role) return fail("Role not found", 404);
    if ((role.kind === "SUPER_ADMIN" || role.kind === "ADMIN") && actor.role.kind !== "SUPER_ADMIN") {
      return fail("Only Super Admin can invite Admins", 403);
    }
    if ((role.kind === "TEAM_MEMBER" || role.kind === "SCANNER" || role.kind === "CUSTOM") && !body.folders?.length) {
      return fail("Choose folder access for this role");
    }
    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({ where: { organizationId: actor.organizationId, email } });
    if (existing) return fail("A user with that email already exists", 409);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
    const token = randomToken();

    const created = await prisma.$transaction(async (tx) => {
      const invited = await tx.user.create({
        data: {
          organizationId: actor.organizationId,
          email,
          firstName: body.firstName?.trim() || email.split("@")[0],
          lastName: body.lastName?.trim() || "",
          roleId: role.id,
          status: "PENDING",
        },
      });
      if (body.folders?.length) {
        await tx.folderAcl.createMany({
          data: body.folders.map((f) => ({ userId: invited.id, folderId: f.folderId, grant: f.grant })),
        });
      }
      await tx.invite.create({
        data: {
          organizationId: actor.organizationId,
          email,
          firstName: body.firstName,
          lastName: body.lastName,
          roleId: role.id,
          token,
          expiresAt,
          invitedById: actor.id,
        },
      });
      return invited;
    });

    await sendInviteEmail(email, created.firstName, token);
    return ok({ user: { ...created, inviteUrl: `/invite/${token}` } }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireUser();
    assertCan(actor, "manage_users");
    const body = await readJson(
      request,
      z.object({
        userId: z.string().uuid(),
        status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
        roleId: z.string().uuid().optional(),
        resend: z.boolean().optional(),
        revoke: z.boolean().optional(),
        folders: z.array(z.object({ folderId: z.string().uuid(), grant: z.enum(["VIEW", "EDIT"]) })).optional(),
      }),
    );
    const target = await prisma.user.findFirst({ where: { id: body.userId, organizationId: actor.organizationId } });
    if (!target) return fail("Not found", 404);
    if (body.resend) {
      const token = randomToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
      await prisma.invite.create({
        data: {
          organizationId: actor.organizationId,
          email: target.email,
          firstName: target.firstName,
          lastName: target.lastName,
          roleId: target.roleId,
          token,
          expiresAt,
          invitedById: actor.id,
        },
      });
      await sendInviteEmail(target.email, target.firstName, token);
      return ok({ inviteUrl: `/invite/${token}` });
    }
    if (body.revoke) {
      await prisma.invite.deleteMany({ where: { email: target.email, organizationId: actor.organizationId, acceptedAt: null } });
      if (target.status === "PENDING") {
        await prisma.user.delete({ where: { id: target.id } });
      }
      return ok({ ok: true });
    }
    if (body.folders) {
      await prisma.folderAcl.deleteMany({ where: { userId: target.id } });
      if (body.folders.length) {
        await prisma.folderAcl.createMany({
          data: body.folders.map((f) => ({ userId: target.id, folderId: f.folderId, grant: f.grant })),
        });
      }
    }
    if (body.status === "DEACTIVATED") {
      const superCount = await prisma.user.count({
        where: { organizationId: actor.organizationId, status: "ACTIVE", role: { kind: "SUPER_ADMIN" } },
      });
      const targetRole = await prisma.role.findUnique({ where: { id: target.roleId } });
      if (targetRole?.kind === "SUPER_ADMIN" && superCount <= 1) {
        return fail("At least one Super Admin must remain");
      }
      await prisma.session.deleteMany({ where: { userId: target.id } });
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status: body.status, roleId: body.roleId },
    });
    return ok({ user: { ...updated, passwordHash: undefined } });
  } catch (error) {
    return handleError(error);
  }
}

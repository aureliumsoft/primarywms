import { generateSid, ALL_ITEMS_NAME, SYSTEM_CUSTOM_FIELDS, SYSTEM_UNITS, QTY_REASONS, MOVE_REASONS, ROLE_DEFAULTS, DEFAULT_ACCENT, DEFAULT_CURRENCY, DEFAULT_COUNTRY, DEFAULT_TIMEZONE, DEFAULT_DATE_FORMAT } from "@primarywms/shared";
import type { Prisma } from "@primarywms/db";
import { prisma } from "./db";
import { hashPassword } from "./auth";

export type SetupInput = {
  companyName: string;
  initials: string;
  accentColor?: string;
  industry?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export async function runSetup(input: SetupInput) {
  const existing = await prisma.organization.findFirst();
  if (existing?.setupCompletedAt) {
    throw new Error("Setup has already been completed");
  }

  const passwordHash = await hashPassword(input.password);
  const accent = input.accentColor || DEFAULT_ACCENT;

  return prisma.$transaction(async (tx) => {
    const org = existing
      ? await tx.organization.update({
          where: { id: existing.id },
          data: {
            name: input.companyName,
            initials: input.initials,
            accentColor: accent,
            industry: input.industry,
            country: DEFAULT_COUNTRY,
            currency: DEFAULT_CURRENCY,
            timezone: DEFAULT_TIMEZONE,
            dateFormat: DEFAULT_DATE_FORMAT,
            setupCompletedAt: new Date(),
          },
        })
      : await tx.organization.create({
          data: {
            name: input.companyName,
            initials: input.initials,
            accentColor: accent,
            industry: input.industry,
            country: DEFAULT_COUNTRY,
            currency: DEFAULT_CURRENCY,
            timezone: DEFAULT_TIMEZONE,
            dateFormat: DEFAULT_DATE_FORMAT,
            setupCompletedAt: new Date(),
          },
        });

    const roleData: { kind: "SUPER_ADMIN" | "ADMIN" | "TEAM_MEMBER" | "SCANNER"; name: string }[] = [
      { kind: "SUPER_ADMIN", name: "Owners" },
      { kind: "ADMIN", name: "Admins" },
      { kind: "TEAM_MEMBER", name: "Team Members" },
      { kind: "SCANNER", name: "Scanner" },
    ];

    const roles = [];
    for (const role of roleData) {
      roles.push(
        await tx.role.create({
          data: {
            organizationId: org.id,
            kind: role.kind,
            name: role.name,
            isSystem: true,
            permissions: ROLE_DEFAULTS[role.kind] as Prisma.InputJsonValue,
          },
        }),
      );
    }
    const superAdminRole = roles.find((r) => r.kind === "SUPER_ADMIN")!;

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        email: input.email.toLowerCase().trim(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: superAdminRole.id,
        status: "ACTIVE",
      },
    });

    await tx.folder.create({
      data: {
        organizationId: org.id,
        parentId: null,
        sid: generateSid(),
        name: ALL_ITEMS_NAME,
        createdById: user.id,
      },
    });

    for (const unit of SYSTEM_UNITS) {
      await tx.unit.create({
        data: {
          organizationId: org.id,
          name: unit.name,
          abbreviation: unit.abbreviation,
          type: unit.type,
          isDefault: unit.isDefault,
          isSystem: unit.isSystem,
        },
      });
    }

    for (const [index, field] of SYSTEM_CUSTOM_FIELDS.entries()) {
      await tx.customField.create({
        data: {
          organizationId: org.id,
          name: field.name,
          type: field.type,
          appliesTo: field.appliesTo,
          sortOrder: index,
          maxLength: field.type === "LARGE_TEXT" ? 4000 : field.type === "DATE" ? null : 190,
        },
      });
    }

    for (const name of QTY_REASONS) {
      await tx.transactionReason.create({
        data: {
          organizationId: org.id,
          kind: "QUANTITY",
          name,
          isDefault: name === "Inventory Count Adjustment",
          isSystem: true,
        },
      });
    }
    for (const name of MOVE_REASONS) {
      await tx.transactionReason.create({
        data: {
          organizationId: org.id,
          kind: "MOVE",
          name,
          isDefault: name === "Other",
          isSystem: true,
        },
      });
    }

    return { org, user };
  });
}

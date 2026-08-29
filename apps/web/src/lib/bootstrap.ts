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

  // Sequential writes (no interactive transaction) so setup works on pooled Prisma Postgres.
  const org = existing
    ? await prisma.organization.update({
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
    : await prisma.organization.create({
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

  const roles = await Promise.all(
    roleData.map((role) =>
      prisma.role.create({
        data: {
          organizationId: org.id,
          kind: role.kind,
          name: role.name,
          isSystem: true,
          permissions: ROLE_DEFAULTS[role.kind] as Prisma.InputJsonValue,
        },
      }),
    ),
  );
  const superAdminRole = roles.find((r) => r.kind === "SUPER_ADMIN")!;

  const user = await prisma.user.create({
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

  await prisma.folder.create({
    data: {
      organizationId: org.id,
      parentId: null,
      sid: generateSid(),
      name: ALL_ITEMS_NAME,
      createdById: user.id,
    },
  });

  await prisma.unit.createMany({
    data: SYSTEM_UNITS.map((unit) => ({
      organizationId: org.id,
      name: unit.name,
      abbreviation: unit.abbreviation,
      type: unit.type,
      isDefault: unit.isDefault,
      isSystem: unit.isSystem,
    })),
  });

  await prisma.customField.createMany({
    data: SYSTEM_CUSTOM_FIELDS.map((field, index) => ({
      organizationId: org.id,
      name: field.name,
      type: field.type,
      appliesTo: field.appliesTo,
      sortOrder: index,
      maxLength: field.type === "LARGE_TEXT" ? 4000 : field.type === "DATE" ? null : 190,
    })),
  });

  await prisma.transactionReason.createMany({
    data: [
      ...QTY_REASONS.map((name) => ({
        organizationId: org.id,
        kind: "QUANTITY" as const,
        name,
        isDefault: name === "Inventory Count Adjustment",
        isSystem: true,
      })),
      ...MOVE_REASONS.map((name) => ({
        organizationId: org.id,
        kind: "MOVE" as const,
        name,
        isDefault: name === "Other",
        isSystem: true,
      })),
    ],
  });

  return { org, user };
}

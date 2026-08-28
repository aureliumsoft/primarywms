import { SMALL_TEXT_MAX, LARGE_TEXT_MAX, SYSTEM_CUSTOM_FIELDS } from "@primarywms/shared";
import { Prisma, type AppliesTo, type CustomFieldType } from "@primarywms/db";
import { z } from "zod";
import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan } from "./auth";
import {
  isEmptyCustomPayload,
  validateFieldValue,
  type CustomValuePayload,
} from "./custom-field-values";

export const customValueInputSchema = z.object({
  fieldId: z.string().uuid(),
  valueText: z.string().nullable().optional(),
  valueDate: z.string().nullable().optional(),
  valueBool: z.boolean().nullable().optional(),
  valueNum: z.number().nullable().optional(),
});

const TYPE_LIMITS: Partial<Record<CustomFieldType, number>> = {
  SMALL_TEXT: SMALL_TEXT_MAX,
  LARGE_TEXT: LARGE_TEXT_MAX,
  SCANNER: SMALL_TEXT_MAX,
  PHONE: SMALL_TEXT_MAX,
  EMAIL: SMALL_TEXT_MAX,
  WEB_LINK: 300,
};

const LIST_VISIBLE_DEFAULTS = new Set(["Description", "Category", "Condition"]);

export async function ensureSystemCustomFields(organizationId: string) {
  const existing = await prisma.customField.findMany({
    where: { organizationId },
    select: { id: true, name: true, type: true, appliesTo: true, sortOrder: true },
  });
  const byName = new Map(existing.map((field) => [field.name.toLowerCase(), field]));
  let sortOrder = existing.reduce((max, field) => Math.max(max, field.sortOrder), -1);

  for (const spec of SYSTEM_CUSTOM_FIELDS) {
    const found = byName.get(spec.name.toLowerCase());
    if (!found) {
      sortOrder += 1;
      await prisma.customField.create({
        data: {
          organizationId,
          name: spec.name,
          type: spec.type,
          appliesTo: spec.appliesTo,
          sortOrder,
          maxLength: spec.type === "LARGE_TEXT" ? LARGE_TEXT_MAX : spec.type === "DATE" ? null : SMALL_TEXT_MAX,
          listVisible: LIST_VISIBLE_DEFAULTS.has(spec.name),
        },
      });
      continue;
    }
    if (spec.name === "Purchase Date" && (found.appliesTo !== "BOTH" || found.type !== "DATE")) {
      const valueCount =
        found.type === "DATE" ? 0 : await prisma.customFieldValue.count({ where: { fieldId: found.id } });
      await prisma.customField.update({
        where: { id: found.id },
        data: {
          appliesTo: "BOTH",
          ...(found.type !== "DATE" && valueCount === 0 ? { type: "DATE", maxLength: null } : {}),
        },
      });
    }
  }
}

export async function createCustomField(
  user: AuthUser,
  input: {
    name: string;
    type: CustomFieldType;
    appliesTo: AppliesTo;
    placeholder?: string | null;
    defaultValue?: string | null;
    options?: string[];
    applyDefault?: boolean;
  },
) {
  assertCan(user, "manage_catalog_settings");
  const name = input.name.trim();
  if (!name) throw new Error("Field name is required");
  if (name.length > SMALL_TEXT_MAX) throw new Error(`Field name must be ${SMALL_TEXT_MAX} characters or fewer`);
  if (input.type === "DROPDOWN") {
    const options = input.options?.map((option) => option.trim()).filter(Boolean) ?? [];
    if (!options.length) throw new Error("Dropdown fields need at least one option");
    if (options.length > 250) throw new Error("Dropdown fields can have at most 250 options");
    if (options.some((option) => option.length > SMALL_TEXT_MAX)) {
      throw new Error(`Each dropdown option must be ${SMALL_TEXT_MAX} characters or fewer`);
    }
    if (input.defaultValue?.trim() && !options.includes(input.defaultValue.trim())) {
      throw new Error("Default option must be one of the listed options");
    }
  }

  const exists = await prisma.customField.findFirst({
    where: { organizationId: user.organizationId, name: { equals: name, mode: "insensitive" } },
  });
  if (exists) throw new Error("A field with that name already exists");

  const count = await prisma.customField.count({ where: { organizationId: user.organizationId } });
  const field = await prisma.customField.create({
    data: {
      organizationId: user.organizationId,
      name,
      type: input.type,
      appliesTo: input.appliesTo,
      placeholder: input.placeholder?.trim() || null,
      defaultValue: input.defaultValue?.trim() || null,
      options: (input.options?.filter((o) => o.trim()) ?? undefined) as Prisma.InputJsonValue | undefined,
      maxLength: TYPE_LIMITS[input.type] ?? null,
      sortOrder: count,
    },
  });

  const def = input.defaultValue?.trim();
  if (input.applyDefault && def) {
    const value =
      input.type === "DATE"
        ? { valueDate: new Date(def), valueText: null as string | null }
        : input.type === "CHECKBOX"
          ? { valueBool: def === "true" || def === "1", valueText: null as string | null }
          : input.type === "WHOLE_NUMBER" || input.type === "DECIMAL"
            ? { valueNum: Number(def), valueText: def }
            : { valueText: def };

    if (input.appliesTo !== "FOLDER") {
      const items = await prisma.item.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (items.length) {
        await prisma.customFieldValue.createMany({
          data: items.map((item) => ({
            fieldId: field.id,
            ownerType: "ITEM" as const,
            itemId: item.id,
            ...value,
          })),
          skipDuplicates: true,
        });
      }
    }
    if (input.appliesTo !== "ITEM") {
      const folders = await prisma.folder.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (folders.length) {
        await prisma.customFieldValue.createMany({
          data: folders.map((folder) => ({
            fieldId: field.id,
            ownerType: "FOLDER" as const,
            folderId: folder.id,
            ...value,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  return field;
}

async function getOrgField(user: AuthUser, id: string) {
  const field = await prisma.customField.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!field) throw new Error("NOT_FOUND");
  return field;
}

export async function updateCustomField(
  user: AuthUser,
  id: string,
  input: {
    name?: string;
    placeholder?: string | null;
    defaultValue?: string | null;
    listVisible?: boolean;
  },
) {
  assertCan(user, "manage_catalog_settings");
  await getOrgField(user, id);

  const data: Prisma.CustomFieldUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Field name is required");
    if (name.length > SMALL_TEXT_MAX) throw new Error(`Field name must be ${SMALL_TEXT_MAX} characters or fewer`);
    const exists = await prisma.customField.findFirst({
      where: {
        organizationId: user.organizationId,
        id: { not: id },
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (exists) throw new Error("A field with that name already exists");
    data.name = name;
  }
  if (input.placeholder !== undefined) {
    const placeholder = input.placeholder?.trim() || null;
    if (placeholder && placeholder.length > SMALL_TEXT_MAX) {
      throw new Error(`Placeholder must be ${SMALL_TEXT_MAX} characters or fewer`);
    }
    data.placeholder = placeholder;
  }
  if (input.defaultValue !== undefined) {
    data.defaultValue = input.defaultValue?.trim() || null;
  }
  if (input.listVisible !== undefined) data.listVisible = input.listVisible;

  return prisma.customField.update({ where: { id }, data });
}

export async function deleteCustomField(user: AuthUser, id: string) {
  assertCan(user, "manage_catalog_settings");
  await getOrgField(user, id);
  await prisma.customField.delete({ where: { id } });
}

export async function writeCustomFieldValues(
  tx: Prisma.TransactionClient,
  organizationId: string,
  owner: { itemId: string } | { folderId: string },
  values: CustomValuePayload[] | undefined,
) {
  if (!values?.length) return;
  const ownerType = "itemId" in owner ? "ITEM" : "FOLDER";
  const fields = await tx.customField.findMany({
    where: { organizationId, id: { in: values.map((value) => value.fieldId) } },
  });
  const byId = new Map(fields.map((field) => [field.id, field]));

  for (const value of values) {
    const field = byId.get(value.fieldId);
    if (!field) throw new Error("Unknown custom field");
    if (ownerType === "ITEM" && field.appliesTo === "FOLDER") {
      throw new Error(`${field.name} does not apply to items`);
    }
    if (ownerType === "FOLDER" && field.appliesTo === "ITEM") {
      throw new Error(`${field.name} does not apply to folders`);
    }

    const raw =
      field.type === "CHECKBOX"
        ? value.valueBool
          ? "true"
          : ""
        : field.type === "DATE"
          ? (value.valueDate ?? "")
          : field.type === "WHOLE_NUMBER" || field.type === "DECIMAL"
            ? value.valueNum != null
              ? String(value.valueNum)
              : (value.valueText ?? "")
            : (value.valueText ?? "");
    validateFieldValue(field, raw);

    const empty = field.type === "CHECKBOX" ? false : isEmptyCustomPayload(value);
    const target =
      "itemId" in owner ? { fieldId: field.id, itemId: owner.itemId } : { fieldId: field.id, folderId: owner.folderId };

    if (empty) {
      await tx.customFieldValue.deleteMany({ where: target });
      continue;
    }

    const data = {
      valueText: value.valueText ?? null,
      valueDate: value.valueDate ? new Date(value.valueDate) : null,
      valueBool: value.valueBool ?? null,
      valueNum: value.valueNum ?? null,
    };

    await tx.customFieldValue.upsert({
      where:
        "itemId" in owner
          ? { fieldId_itemId: { fieldId: field.id, itemId: owner.itemId } }
          : { fieldId_folderId: { fieldId: field.id, folderId: owner.folderId } },
      update: data,
      create: {
        fieldId: field.id,
        ownerType,
        ...owner,
        ...data,
      },
    });
  }
}

export async function reorderCustomFields(user: AuthUser, ids: string[]) {
  assertCan(user, "manage_catalog_settings");
  const fields = await prisma.customField.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true },
  });
  const known = new Set(fields.map((f) => f.id));
  if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
    throw new Error("Invalid field order");
  }
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.customField.update({ where: { id }, data: { sortOrder } })));
}

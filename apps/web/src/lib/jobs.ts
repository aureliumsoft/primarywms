import { prisma } from "./db";
import type { AuthUser } from "./auth";
import { assertCan, assertFolderAccess } from "./auth";
import { getRootFolder } from "./catalog";
import { createFolder, moveItemQty, updateQuantity } from "./inventory";
import type { CustomValuePayload } from "./custom-field-values";

export const SUGGESTED_JOB_SUBFOLDERS = ["Materials", "Tools", "Equipment"] as const;

export type JobLeftoverAction = "return" | "consume" | "leave";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is string => typeof row === "string" && row.trim().length > 0).map((row) => row.trim());
}

export async function getJobSettings(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { jobDefaultSubfolders: true, jobExtraFieldIds: true },
  });
  return {
    defaultSubfolders: asStringArray(org.jobDefaultSubfolders),
    extraFieldIds: asStringArray(org.jobExtraFieldIds),
  };
}

export async function updateJobSettings(
  user: AuthUser,
  input: { defaultSubfolders?: string[]; extraFieldIds?: string[] },
) {
  assertCan(user, "edit_folder");
  const data: { jobDefaultSubfolders?: string[]; jobExtraFieldIds?: string[] } = {};
  if (input.defaultSubfolders !== undefined) {
    data.jobDefaultSubfolders = input.defaultSubfolders.map((name) => name.trim()).filter(Boolean);
  }
  if (input.extraFieldIds !== undefined) {
    data.jobExtraFieldIds = input.extraFieldIds;
  }
  await prisma.organization.update({
    where: { id: user.organizationId },
    data,
  });
  return getJobSettings(user.organizationId);
}

function serializeJob<
  T extends {
    id: string;
    folderId: string;
    number: string;
    startDate: Date | null;
    endDate: Date | null;
    notes: string | null;
    externalLink: string | null;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    folder?: { id: string; name: string; kind: string; jobStatus: string | null; deletedAt: Date | null } | null;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
  },
>(job: T) {
  return {
    id: job.id,
    folderId: job.folderId,
    number: job.number,
    startDate: job.startDate?.toISOString() ?? null,
    endDate: job.endDate?.toISOString() ?? null,
    notes: job.notes,
    externalLink: job.externalLink,
    status: job.status,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    folder: job.folder
      ? {
          id: job.folder.id,
          name: job.folder.name,
          kind: job.folder.kind,
          jobStatus: job.folder.jobStatus,
        }
      : undefined,
    createdBy: job.createdBy
      ? {
          id: job.createdBy.id,
          name: `${job.createdBy.firstName} ${job.createdBy.lastName}`.trim(),
        }
      : null,
  };
}

async function nextJobNumber(organizationId: string) {
  const count = await prisma.job.count({ where: { organizationId } });
  for (let i = count + 1; i < count + 1000; i += 1) {
    const number = `JOB-${String(i).padStart(6, "0")}`;
    const exists = await prisma.job.findUnique({
      where: { organizationId_number: { organizationId, number } },
    });
    if (!exists) return number;
  }
  return `JOB-${Date.now()}`;
}

export async function listJobs(user: AuthUser, opts: { includeCompleted?: boolean; q?: string } = {}) {
  const jobs = await prisma.job.findMany({
    where: {
      organizationId: user.organizationId,
      ...(opts.includeCompleted ? {} : { status: { not: "COMPLETED" } }),
      ...(opts.q?.trim()
        ? {
            OR: [
              { number: { contains: opts.q.trim(), mode: "insensitive" } },
              { notes: { contains: opts.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
      folder: { deletedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return jobs.map(serializeJob);
}

export async function getJob(user: AuthUser, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: user.organizationId, folder: { deletedAt: null } },
    include: {
      folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!job) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, job.folderId, "VIEW");
  return serializeJob(job);
}

export async function getJobByFolderId(user: AuthUser, folderId: string) {
  const job = await prisma.job.findFirst({
    where: { folderId, organizationId: user.organizationId, folder: { deletedAt: null } },
    include: {
      folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!job) return null;
  await assertFolderAccess(user, job.folderId, "VIEW");
  return serializeJob(job);
}

export async function createJob(
  user: AuthUser,
  input: {
    number?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
    externalLink?: string | null;
    customValues?: CustomValuePayload[];
  },
) {
  assertCan(user, "add_folder");
  const settings = await getJobSettings(user.organizationId);
  const root = await getRootFolder(user.organizationId);
  const number = (input.number?.trim() || (await nextJobNumber(user.organizationId))).trim();
  if (!number) throw new Error("Job number is required");

  const clash = await prisma.job.findUnique({
    where: { organizationId_number: { organizationId: user.organizationId, number } },
  });
  if (clash) throw new Error("A job with that number already exists");

  const startDate = input.startDate ? new Date(input.startDate) : null;
  const endDate = input.endDate ? new Date(input.endDate) : null;
  if (startDate && Number.isNaN(startDate.getTime())) throw new Error("Invalid start date");
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("Invalid end date");
  if (startDate && endDate && endDate < startDate) throw new Error("End date must be on or after start date");

  const link = input.externalLink?.trim() || null;
  if (link) {
    try {
      // eslint-disable-next-line no-new
      new URL(link);
    } catch {
      throw new Error("External link must be a valid URL");
    }
  }

  const folder = await createFolder(user, {
    parentId: root.id,
    name: number,
    notes: input.notes ?? null,
    kind: "JOB",
    jobStatus: "NOT_STARTED",
    customValues: input.customValues,
  });

  for (const name of settings.defaultSubfolders) {
    await createFolder(user, {
      parentId: folder.id,
      name,
      kind: "ITEM",
    });
  }

  const job = await prisma.job.create({
    data: {
      organizationId: user.organizationId,
      folderId: folder.id,
      number,
      startDate,
      endDate,
      notes: input.notes?.trim() || null,
      externalLink: link,
      status: "NOT_STARTED",
      createdById: user.id,
    },
    include: {
      folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return serializeJob(job);
}

export async function updateJob(
  user: AuthUser,
  jobId: string,
  input: {
    number?: string;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
    externalLink?: string | null;
    status?: "NOT_STARTED" | "IN_PROGRESS";
  },
) {
  assertCan(user, "edit_folder");
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: user.organizationId },
    include: { folder: true },
  });
  if (!job || job.folder.deletedAt) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, job.folderId, "EDIT");

  if (job.status === "COMPLETED" && input.status !== "IN_PROGRESS" && input.status !== "NOT_STARTED") {
    throw new Error("This job is completed and locked. Reopen it to make changes.");
  }

  const nextNumber = input.number !== undefined ? input.number.trim() : job.number;
  if (!nextNumber) throw new Error("Job number is required");
  if (nextNumber !== job.number) {
    const clash = await prisma.job.findUnique({
      where: { organizationId_number: { organizationId: user.organizationId, number: nextNumber } },
    });
    if (clash) throw new Error("A job with that number already exists");
  }

  const startDate =
    input.startDate === undefined ? job.startDate : input.startDate ? new Date(input.startDate) : null;
  const endDate = input.endDate === undefined ? job.endDate : input.endDate ? new Date(input.endDate) : null;
  if (startDate && Number.isNaN(startDate.getTime())) throw new Error("Invalid start date");
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("Invalid end date");
  if (startDate && endDate && endDate < startDate) throw new Error("End date must be on or after start date");

  let link = job.externalLink;
  if (input.externalLink !== undefined) {
    link = input.externalLink?.trim() || null;
    if (link) {
      try {
        // eslint-disable-next-line no-new
        new URL(link);
      } catch {
        throw new Error("External link must be a valid URL");
      }
    }
  }

  const nextStatus = input.status ?? job.status;
  const completedAt = nextStatus === "COMPLETED" ? job.completedAt ?? new Date() : null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.folder.update({
      where: { id: job.folderId },
      data: {
        name: nextNumber,
        notes: input.notes !== undefined ? input.notes : undefined,
        jobStatus: nextStatus,
      },
    });
    return tx.job.update({
      where: { id: job.id },
      data: {
        number: nextNumber,
        startDate,
        endDate,
        notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
        externalLink: link,
        status: nextStatus,
        completedAt,
      },
      include: {
        folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });

  return serializeJob(updated);
}

async function jobFolderIds(organizationId: string, rootFolderId: string) {
  const folders = await prisma.folder.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  const ids = new Set<string>([rootFolderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

export async function completeJob(user: AuthUser, jobId: string, leftover: JobLeftoverAction = "leave") {
  assertCan(user, "edit_folder");
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: user.organizationId },
    include: { folder: true },
  });
  if (!job || job.folder.deletedAt) throw new Error("NOT_FOUND");
  await assertFolderAccess(user, job.folderId, "EDIT");
  if (job.status === "COMPLETED") throw new Error("Job is already completed");

  const folderIds = await jobFolderIds(user.organizationId, job.folderId);
  const items = await prisma.item.findMany({
    where: {
      organizationId: user.organizationId,
      folderId: { in: folderIds },
      deletedAt: null,
      quantity: { gt: 0 },
    },
  });

  if (leftover === "return" || leftover === "consume") {
    const root = await getRootFolder(user.organizationId);
    for (const item of items) {
      const qty = Number(item.quantity);
      if (qty <= 0) continue;
      if (leftover === "consume") {
        await updateQuantity(user, {
          itemId: item.id,
          newQuantity: 0,
          mode: "SET",
          note: `Consumed on completing job ${job.number}`,
        });
        continue;
      }
      let destId = item.lastFromFolderId;
      if (!destId || folderIds.includes(destId)) destId = root.id;
      const dest = await prisma.folder.findFirst({
        where: { id: destId, organizationId: user.organizationId, deletedAt: null },
      });
      if (!dest || (dest.kind === "JOB" && dest.jobStatus === "COMPLETED")) {
        destId = root.id;
      }
      await moveItemQty(user, {
        itemId: item.id,
        destinationFolderId: destId,
        quantity: qty,
        note: `Returned on completing job ${job.number}`,
      });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.folder.update({
      where: { id: job.folderId },
      data: { jobStatus: "COMPLETED" },
    });
    return tx.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: {
        folder: { select: { id: true, name: true, kind: true, jobStatus: true, deletedAt: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });

  return serializeJob(updated);
}

export async function pullItemToJob(
  user: AuthUser,
  jobId: string,
  input: { itemId: string; quantity: number; reason?: string | null; note?: string | null },
) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: user.organizationId },
    include: { folder: true },
  });
  if (!job || job.folder.deletedAt) throw new Error("NOT_FOUND");
  if (job.status === "COMPLETED") throw new Error("This job is completed and locked");
  await assertFolderAccess(user, job.folderId, "EDIT");

  if (job.status === "NOT_STARTED") {
    await updateJob(user, jobId, { status: "IN_PROGRESS" });
  }

  return moveItemQty(user, {
    itemId: input.itemId,
    destinationFolderId: job.folderId,
    quantity: input.quantity,
    reason: input.reason,
    note: input.note ?? `Pulled into job ${job.number}`,
  });
}

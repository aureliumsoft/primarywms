import {
  PrismaClient,
  Prisma,
  type AlertRecipientKind,
  type AppliesTo,
  type BarcodeSymbology,
  type CustomFieldType,
  type DateOffsetUnit,
  type DateWhen,
  type FolderGrant,
  type FolderKind,
  type InvoiceStatus,
  type JobStatus,
  type PickItemOutcome,
  type PickListStatus,
  type PurchaseOrderStatus,
  type QtyComparator,
  type RoleKind,
  type StockCountStatus,
  type TransactionType,
  type UserStatus,
} from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { Prisma, PrismaClient };
export type {
  AlertRecipientKind,
  AppliesTo,
  BarcodeSymbology,
  CustomFieldType,
  DateOffsetUnit,
  DateWhen,
  FolderGrant,
  FolderKind,
  InvoiceStatus,
  JobStatus,
  PickItemOutcome,
  PickListStatus,
  PurchaseOrderStatus,
  QtyComparator,
  RoleKind,
  StockCountStatus,
  TransactionType,
  UserStatus,
};

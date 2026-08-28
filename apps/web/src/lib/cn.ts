import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function serializeDecimal(value: unknown): number | null {
  if (value == null) return null;
  return Number(value);
}

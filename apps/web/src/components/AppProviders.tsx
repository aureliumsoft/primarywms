"use client";

import { ToastHost } from "./ToastHost";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}

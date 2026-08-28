import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_NAME, DEFAULT_ACCENT } from "@primarywms/shared";
import { getOrganization } from "@/lib/org";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: "Inventory for one organization — folders, items, moves, and history.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const org = await getOrganization();
  const accent = org?.accentColor || DEFAULT_ACCENT;
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
        style={
          {
            "--primary": accent,
            "--ring": accent,
          } as CSSProperties
        }
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

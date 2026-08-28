import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrganization } from "@/lib/org";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const org = await getOrganization();
  if (!org) redirect("/setup");
  return (
    <AppShell
      org={{ name: org.name, initials: org.initials, accentColor: org.accentColor, logoKey: org.logoKey }}
      user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
    >
      {children}
    </AppShell>
  );
}

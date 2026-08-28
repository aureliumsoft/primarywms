import { BrandMark, SetupForm } from "@/components/AuthForms";
import { isSetupComplete } from "@/lib/org";
import { redirect } from "next/navigation";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  if (await isSetupComplete()) redirect("/login");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
        <BrandMark subtitle="Create your organization and Super Admin" />
        <SetupForm />
      </div>
    </div>
  );
}

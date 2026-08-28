import { BrandMark, LoginForm } from "@/components/AuthForms";
import { isSetupComplete } from "@/lib/org";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (!(await isSetupComplete())) redirect("/setup");
  if (await getCurrentUser()) redirect("/items");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
        <BrandMark subtitle="Sign in with your work email" />
        <LoginForm />
      </div>
    </div>
  );
}

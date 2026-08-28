import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSetupComplete } from "@/lib/org";

export default async function HomePage() {
  if (!(await isSetupComplete())) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect("/items");
}

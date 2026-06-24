import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { getSubscriptionAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getSubscriptionAccess(user.id);
  return <AppShell userEmail={user.email ?? "Account"} access={access}>{children}</AppShell>;
}

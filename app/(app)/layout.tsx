import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import ScoreHydrator from "@/components/ScoreHydrator";
import { getUnreadAlertCountForUser } from "@/lib/alerts";
import { getCurrentUser, getRequestContext } from "@/lib/auth/currentUser";

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const { data: { user } } = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ access, latestScore }, unreadAlertCount] = await Promise.all([
    getRequestContext(),
    getUnreadAlertCountForUser(user.id),
  ]);
  if (!access) redirect("/login");

  return <AppShell userEmail={user.email ?? "Account"} access={access} unreadAlertCount={unreadAlertCount}><ScoreHydrator hasScore={Boolean(latestScore?.answers)} />{children}</AppShell>;
}

import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import ScoreHydrator from "@/components/ScoreHydrator";
import { getMatchedAlerts } from "@/lib/alerts";
import type { Answers } from "@/lib/scoring";
import { getSubscriptionAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

function countUnreadAlerts(alerts: { created_at?: string | null; personalized?: boolean }[], lastSeenAt?: string | null) {
  if (!lastSeenAt) return 0;
  const lastSeen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeen)) return 0;
  return alerts.filter((alert) => {
    if (alert.personalized) return false;
    const created = alert.created_at ? new Date(alert.created_at).getTime() : NaN;
    return Number.isFinite(created) && created > lastSeen;
  }).length;
}

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [access, { data: activity }, { data: latest }] = await Promise.all([
    getSubscriptionAccess(user.id),
    supabase.from("user_activity").select("last_seen_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("scores").select("answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const answers = latest?.answers as Answers | undefined;
  const alerts = answers ? await getMatchedAlerts(supabase, { state: answers.state, age: answers.age, worry: answers.worry }, 12) : [];
  const unreadAlertCount = countUnreadAlerts(alerts, activity?.last_seen_at as string | null | undefined);
  return <AppShell userEmail={user.email ?? "Account"} access={access} unreadAlertCount={unreadAlertCount}><ScoreHydrator hasScore={Boolean(latest?.answers)} />{children}</AppShell>;
}

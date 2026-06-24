import { redirect } from "next/navigation";
import ProfileSetupForm from "@/components/plan/ProfileSetupForm";
import { createClient } from "@/lib/supabase/server";
import type { Answers } from "@/lib/scoring";

export default async function PlanSetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: latestScore }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("scores")
      .select("answers")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <ProfileSetupForm
      initialProfile={profile}
      quizAnswers={(latestScore?.answers as Answers | null) ?? null}
    />
  );
}

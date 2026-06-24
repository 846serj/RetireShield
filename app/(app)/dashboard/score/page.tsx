import { getSubscriptionAccess } from "@/lib/subscription";
import { getScoreHistory } from "@/lib/scoreHistory";
import { ScoreGauge } from "@/components/ScoreGauge";
import ScoreHistoryChart from "@/components/ScoreHistoryChart";
import PlanList from "@/components/PlanList";
import LockedTeaser from "@/components/LockedTeaser";
import { Button, Eyebrow } from "@/components/ui";
import { isProfileScoreable } from "@/lib/profileScoreable";
import { getLatestScore, getPlanForLatest, requireUser, SUB_SCORE_LABELS } from "../_lib/dashboard";

export default async function ScorePage() {
  const { supabase, user } = await requireUser("/dashboard/score");
  const access = await getSubscriptionAccess(user.id);
  const latest = await getLatestScore(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  const hasQuizScore = latest?.score_source === "quiz";
  const connectedScored = ["connected", "monthly_rescore"].includes(String(latest?.score_source ?? ""));
  const scoreable = isProfileScoreable(profile, hasQuizScore, connectedScored);
  const plan = scoreable ? await getPlanForLatest(supabase, latest) : [];
  const scoreHistory = access.active ? await getScoreHistory(supabase, user.id) : [];
  const scoreSubScores = latest?.sub_scores ? (Object.entries(SUB_SCORE_LABELS) as [keyof typeof SUB_SCORE_LABELS, string][]).map(([key, label]) => ({ label, value: Number(latest.sub_scores[key] ?? 0), scoreKey: key })) : [];

  return <div className="mx-auto max-w-6xl py-8 sm:py-10">
    <div className="mb-8"><Eyebrow>Safety Score</Eyebrow><h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Your Retirement Safety Score</h1></div>
    {scoreable && latest ? <section className="mb-8"><ScoreGauge value={latest.overall} band={latest.band} subScores={scoreSubScores} badge="Latest check-in" subtitle="Includes your four sub-scores and verdict" /></section> : <section className="rg-card mb-8 text-center"><h2 className="text-3xl font-extrabold">Take your first check-in</h2><p className="mt-3 text-slate-700">Add a few details (or take the 2-minute quiz) to get your Safety Score.</p><Button href="/quiz" className="mt-6">Take the Score quiz</Button></section>}
    {access.active ? <><ScoreHistoryChart points={scoreHistory} /><PlanList items={plan} /></> : <div className="space-y-6"><LockedTeaser eyebrow="Score over time" title="Unlock your score trend" description="Premium members see a month-by-month chart built from their saved score history."><ScoreHistoryChart points={[]} /></LockedTeaser><LockedTeaser eyebrow="Action plan" title="Unlock your full action plan" description="See every step and check them off as you go. Start your free trial."><PlanList items={plan} /></LockedTeaser></div>}
  </div>;
}

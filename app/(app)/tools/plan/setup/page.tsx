import ProfileSetupForm from "@/components/plan/ProfileSetupForm";
import { getRequestContext } from "@/lib/auth/currentUser";
import type { Answers } from "@/lib/scoring";

export default async function PlanSetupPage() {
  const { profile, latestScore } = await getRequestContext();

  return (
    <ProfileSetupForm
      initialProfile={profile}
      quizAnswers={(latestScore?.answers as Answers | null) ?? null}
    />
  );
}

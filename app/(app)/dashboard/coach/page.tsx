import { getSubscriptionAccess } from "@/lib/subscription";
import CoachChat from "@/components/CoachChat";
import LockedTeaser from "@/components/LockedTeaser";
import { Eyebrow } from "@/components/ui";
import { requireUser } from "../_lib/dashboard";

export default async function CoachPage() {
  const { user } = await requireUser("/dashboard/coach");
  const access = await getSubscriptionAccess(user.id);
  return <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col py-8"><div className="mb-6"><Eyebrow>Ask RetireShield — AI coach ⚙️ Premium</Eyebrow><h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Ask anything about your retirement.</h1></div>{access.active ? <div className="flex-1"><CoachChat tier={access.tier} /></div> : <LockedTeaser title="Unlock the AI coach" description="Upgrade to ask retirement questions grounded in your saved Safety Score and planning profile."><CoachChat tier="free" /></LockedTeaser>}</div>;
}

import { redirect } from "next/navigation";
import CoachChat from "@/components/CoachChat";
import { Button, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionAccess } from "@/lib/subscription";

export default async function CoachPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/coach");

  const access = await getSubscriptionAccess(user.id);
  if (!access.active) {
    return (
      <main className="rg-page-shell">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Eyebrow>Ask RetireShield</Eyebrow>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-ink">AI coach is a paid feature.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-xl font-semibold leading-8 text-slate-700">
            Upgrade to ask retirement questions grounded in your saved Safety Score and planning profile.
          </p>
          <Button href="/upgrade" className="mt-8">Unlock the coach</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="rg-page-shell">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <Eyebrow>Ask RetireShield — AI coach ⚙️ Premium</Eyebrow>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Ask anything about your retirement.</h1>
          <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-700">
            The coach explains your saved answers, score, and deterministic planning calculations in plain English.
          </p>
        </div>
        <CoachChat tier={access.tier} />
      </section>
    </main>
  );
}

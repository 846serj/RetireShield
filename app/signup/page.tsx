"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    }).catch(() => {
      if (mounted) setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  async function createAccount() {
    const normalizedEmail = email.trim().toLowerCase();
    setErr("");
    setNotice("");

    if (!normalizedEmail.includes("@")) {
      setErr("Enter a valid email address to create your account.");
      return;
    }

    if (password.length < 8) {
      setErr("Choose a password with at least 8 characters.");
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { signup_source: "direct_signup" },
        },
      });

      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          setNotice("That email already has an account. Log in to continue to your dashboard.");
        } else {
          setErr(error.message || "We could not create your account. Please try again.");
        }
        return;
      }

      if (!data.session) {
        setAwaitingEmailConfirmation(true);
        setNotice("Check your email to confirm your account. After confirming, we’ll send you to your dashboard where you can take the Safety Score quiz.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErr("We could not reach the sign-up service. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (checkingSession) {
    return <div className="rg-page-shell"><div className="mx-auto max-w-xl px-5 py-20 text-lg text-slate-700">Checking your session…</div></div>;
  }

  return (
    <div className="rg-page-shell min-h-[calc(100vh-5rem)]">
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/80 sm:p-10">
          <p className="rg-kicker">Create your free account</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">Start with a secure dashboard.</h1>
          <p className="mt-5 text-xl leading-8 text-slate-700 sm:text-2xl sm:leading-9">
            Create an account now, then take the Retirement Safety Score quiz from your dashboard when you’re ready.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="signup-email" className="block text-base font-bold text-ink">Email address</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="rg-input mt-2"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-base font-bold text-ink">Password</label>
              <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="min-h-14 flex-1 rounded-l-xl px-4 text-lg outline-none"
                />
                <button type="button" onClick={() => setShowPassword((show) => !show)} className="rounded-r-xl px-4 text-base font-bold text-brand underline">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">Use at least 8 characters.</p>
            </div>
            <Button
              disabled={!email.trim().includes("@") || password.length < 8 || creating || awaitingEmailConfirmation}
              onClick={createAccount}
              className="w-full disabled:opacity-50"
            >
              {creating ? "Creating account…" : awaitingEmailConfirmation ? "Check your email" : "Create free account"}
            </Button>
            {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{err}</p>}
            {notice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">{notice} <Link href="/login" className="font-bold text-brand underline">Log in instead</Link>.</p>}
            <div className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
              <Link href="/login" className="font-bold text-brand underline">Already have an account?</Link>
              <Link href="/quiz" className="font-bold text-brand underline">Prefer to take the quiz first?</Link>
            </div>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-brand/15 bg-band p-6 sm:p-8">
          <p className="rg-kicker">What happens next</p>
          <ol className="mt-5 space-y-5 text-lg font-semibold leading-8 text-slate-700">
            <li><span className="font-extrabold text-ink">1.</span> Create your free RetireShield account.</li>
            <li><span className="font-extrabold text-ink">2.</span> Open your dashboard and take the two-minute Safety Score quiz.</li>
            <li><span className="font-extrabold text-ink">3.</span> Save your score, action plan, alerts, and monitoring preferences in one place.</li>
          </ol>
          <div className="mt-8 rounded-2xl border border-white/80 bg-white p-5 text-base font-semibold leading-7 text-slate-700">
            No credit card. No bank or brokerage linking. Education-only guidance you can review at your own pace.
          </div>
        </aside>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

function getAuthCallbackUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const baseUrl = configuredBaseUrl?.startsWith("http")
    ? configuredBaseUrl.replace(/\/$/, "")
    : window.location.origin;

  return `${baseUrl}/auth/callback`;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  }, [searchParams]);

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
        router.replace(nextPath);
      } else {
        setCheckingSession(false);
      }
    }).catch(() => {
      if (mounted) setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, [nextPath, router]);

  async function createAccount() {
    const normalizedEmail = email.trim().toLowerCase();
    setErr("");
    setNotice("");
    setAwaitingEmailConfirmation(false);

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
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          setNotice("That email already has an account. Log in to continue to your dashboard.");
        } else {
          setErr(error.message || "We could not create your account. Please try again.");
        }
        return;
      }

      if (!data.session) {
        const existingUser = data.user?.identities?.length === 0;
        if (existingUser) {
          setNotice("That email already has an account. Log in to continue to your dashboard.");
          return;
        }

        setNotice("Check your email to confirm your account. After confirming, we’ll send you to your dashboard where you can take the Safety Score quiz.");
        setAwaitingEmailConfirmation(true);
        return;
      }

      router.push(nextPath);
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
      <main className="mx-auto flex max-w-2xl flex-col px-5 py-14 sm:py-20">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/80 sm:p-10">
          <p className="rg-kicker">Create your RetireShield account</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">Start with an account.</h1>
          <p className="mt-5 text-xl leading-8 text-slate-700 sm:text-2xl sm:leading-9">
            Create a free account now. Once you’re in your dashboard, we’ll prompt you to take the short Safety Score quiz when you’re ready.
          </p>

          <div className="mt-8 rounded-2xl border border-brand/15 bg-band p-4 text-base font-semibold text-slate-700">
            Prefer to see your score first? <Link href="/quiz" className="font-bold text-brand underline">Take the 2-minute quiz instead</Link> — no account required.
          </div>

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
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-14 flex-1 rounded-l-xl px-4 text-lg outline-none"
                  aria-describedby="signup-password-help"
                />
                <button type="button" onClick={() => setShowPassword((show) => !show)} className="rounded-r-xl px-4 text-base font-bold text-brand underline">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p id="signup-password-help" className="mt-2 text-sm text-slate-600">At least 8 characters.</p>
            </div>
            <Button
              disabled={!email.trim().includes("@") || password.length < 8 || creating || awaitingEmailConfirmation}
              onClick={createAccount}
              className="w-full disabled:opacity-50"
            >
              {creating ? "Creating account…" : awaitingEmailConfirmation ? "Check your email" : "Create my free account"}
            </Button>
            {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{err}</p>}
            {notice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">{notice}</p>}
            <div className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
              <Link href="/login" className="font-bold text-brand underline">Already have an account? Log in</Link>
              <Link href="/quiz" className="font-bold text-brand underline">Take the score first</Link>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-brand/15 bg-band p-4 text-base font-semibold text-slate-700">
            No bank linking. Your data is private and never sold.
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="rg-page-shell"><div className="mx-auto max-w-xl px-5 py-20 text-lg text-slate-700">Loading sign up…</div></div>}>
      <SignupContent />
    </Suspense>
  );
}

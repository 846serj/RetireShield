"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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

  async function signIn() {
    const normalizedEmail = email.trim().toLowerCase();
    setErr("");
    setNotice("");
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        setErr("That email and password don't match.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setErr("We could not reach the sign-in service. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function sendPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    setErr("");
    setNotice("");
    if (!normalizedEmail.includes("@")) {
      setErr("Enter your email address first, then choose Forgot password.");
      return;
    }

    setResetting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        setErr("We could not send a password reset link. Please try again.");
        return;
      }
      setNotice("Check your email for a password reset link.");
    } catch {
      setErr("We could not reach the password reset service. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  if (checkingSession) {
    return <div className="rg-page-shell"><div className="mx-auto max-w-xl px-5 py-20 text-lg text-slate-700">Checking your session…</div></div>;
  }

  return (
    <div className="rg-page-shell min-h-[calc(100vh-5rem)]">
      <main className="mx-auto flex max-w-2xl flex-col px-5 py-14 sm:py-20">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/80 sm:p-10">
          <p className="rg-kicker">Welcome back</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">Log in to your account</h1>
          <p className="mt-5 text-xl leading-8 text-slate-700 sm:text-2xl sm:leading-9">
            Enter your email and password to get back to your account.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-base font-bold text-ink">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="rg-input mt-2"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-base font-bold text-ink">Password</label>
              <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="min-h-14 flex-1 rounded-l-xl px-4 text-lg outline-none"
                />
                <button type="button" onClick={() => setShowPassword((show) => !show)} className="rounded-r-xl px-4 text-base font-bold text-brand underline">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <Button
              disabled={!email.trim().includes("@") || !password || sending}
              onClick={signIn}
              className="w-full disabled:opacity-50"
            >
              {sending ? "Logging in…" : "Log in"}
            </Button>
            {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{err}</p>}
            {notice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">{notice}</p>}
            <div className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={sendPasswordReset} disabled={resetting} className="text-left font-bold text-brand underline disabled:opacity-50">
                {resetting ? "Sending reset…" : "Forgot password?"}
              </button>
              <Link href="/signup" className="font-bold text-brand underline">New here? Create an account</Link>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-brand/15 bg-band p-4 text-base font-semibold text-slate-700">
            Your data is private and never sold.
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="rg-page-shell"><div className="mx-auto max-w-xl px-5 py-20 text-lg text-slate-700">Loading sign in…</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

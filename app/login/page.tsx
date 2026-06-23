"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    return <div className="mx-auto max-w-md px-4 py-16">Checking your session…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Sign in to RetireShield</h1>
      <div className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-base font-bold text-ink">Email address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-base font-bold text-ink">Password</label>
          <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand">
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
        <button
          disabled={!email.trim().includes("@") || !password || sending}
          onClick={signIn}
          className="w-full rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {sending ? "Signing in…" : "Sign in"}
        </button>
        {err && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{err}</p>}
        {notice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">{notice}</p>}
        <div className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={sendPasswordReset} disabled={resetting} className="text-left font-bold text-brand underline disabled:opacity-50">
            {resetting ? "Sending reset…" : "Forgot password?"}
          </button>
          <Link href="/quiz" className="font-bold text-brand underline">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16">Loading sign in…</div>}>
      <LoginContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Sign in to RetireShield</h1>
      {sent ? (
        <p className="text-lg">Check your email for a secure sign-in link.</p>
      ) : (
        <div className="space-y-4">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg"
          />
          <button
            disabled={!email.includes("@")} onClick={send}
            className="w-full rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
          >
            Email me a sign-in link
          </button>
          {err && <p className="text-bad text-sm">{err}</p>}
          <p className="text-xs text-slate-500">No passwords. We email you a one-time link.</p>
        </div>
      )}
    </div>
  );
}

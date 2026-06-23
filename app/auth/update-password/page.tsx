"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePassword() {
    setError("");
    if (password.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("We could not update your password. Please request a new reset link and try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the password service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-3">Choose a new password</h1>
      <p className="mb-6 text-slate-600">Use at least 8 characters.</p>
      <label htmlFor="new-password" className="block text-base font-bold text-ink">New password</label>
      <div className="mt-2 flex rounded-xl border-2 border-slate-300 bg-white focus-within:border-brand">
        <input
          id="new-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          className="min-h-14 flex-1 rounded-l-xl px-4 text-lg outline-none"
        />
        <button type="button" onClick={() => setShowPassword((show) => !show)} className="rounded-r-xl px-4 text-base font-bold text-brand underline">
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-bad">{error}</p>}
      <button
        type="button"
        onClick={updatePassword}
        disabled={saving || password.length < 8}
        className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save new password"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// If the user took the Score anonymously (stored in localStorage) and has no saved score yet,
// claim it to their account on first dashboard load.
export default function ScoreHydrator({ hasScore }: { hasScore: boolean }) {
  const router = useRouter();
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    if (hasScore) return;
    const raw = localStorage.getItem("rg_score");
    if (!raw) return;
    (async () => {
      try {
        const parsed = JSON.parse(raw);
        const res = await fetch("/api/score-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        if (res.ok) {
          localStorage.removeItem("rg_score");
          if (!sessionStorage.getItem("rg_score_welcome_toast_seen")) {
            sessionStorage.setItem("rg_score_welcome_toast_seen", "true");
            setShowWelcomeToast(true);
          }
          router.refresh();
        }
      } catch {
        /* ignore malformed cache */
      }
    })();
  }, [hasScore, router]);
  useEffect(() => {
    if (!showWelcomeToast) return;
    const timeout = window.setTimeout(() => setShowWelcomeToast(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [showWelcomeToast]);

  if (!showWelcomeToast) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white p-4 text-base font-bold text-ink shadow-xl shadow-slate-300/50 sm:bottom-8">
      Your score is saved. Welcome to RetireShield.
    </div>
  );
}

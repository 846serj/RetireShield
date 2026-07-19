"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { Button, Eyebrow } from "@/components/ui";

function capture(
  event: string,
  properties?: Record<string, string | number | boolean>,
) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export default function NewsletterPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    capture("newsletter_page_viewed");
  }, []);

  async function submitNewsletter() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          utmSource: "newsletter_page",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        setError("We couldn't add you. Please check your email and try again.");
        capture("newsletter_signup_failed");
        return;
      }
      capture("newsletter_signup_submitted", { utmSource: "newsletter_page" });
      setSubmitted(true);
    } catch {
      setError("We couldn't reach the server. Please try again.");
      capture("newsletter_signup_failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rg-page-shell">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-4 py-6 sm:py-10">
        <section className="w-full overflow-hidden rounded-[2rem] bg-brand-dark px-5 py-9 text-center text-white shadow-2xl shadow-brand-dark/20 sm:px-10 sm:py-12">
          <Eyebrow className="text-[#8FB3D9]">FREE · EVERY TUESDAY & FRIDAY · NO ACCOUNT NEEDED</Eyebrow>

          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Get the <span className="text-[#7BD3A8]">straight answer</span> on your retirement — <span className="text-[#7BD3A8]">free</span>, twice a week.
          </h1>

          <p className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-lg font-semibold leading-8 text-white/90 sm:text-xl">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#7BD3A8" strokeWidth="2" />
              <path d="M8.5 12.5l2.5 2.5 4.5-5.5" stroke="#7BD3A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Plain-English money help from Ellen Marsh — what to claim, what to dodge, and what's changing.</span>
          </p>

          {submitted ? (
            <div className="mx-auto mt-9 max-w-lg rounded-3xl bg-white/10 p-6 text-center">
              <h2 className="text-2xl font-bold text-white">You're in — check your inbox.</h2>
              <p className="mx-auto mt-3 text-base leading-7 text-[#D5E2F1]">
                Watch for Retirement Shield from Ellen Marsh every Tuesday & Friday. Add
                ellen@retireshield.com to your contacts so it doesn't get missed.
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto mt-8 max-w-lg">
                <div className="flex flex-col gap-3">
                  <label htmlFor="newsletter-first-name" className="sr-only">First name</label>
                  <input
                    id="newsletter-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="rg-input text-center sm:text-left"
                  />
                  <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="rg-input text-center sm:text-left"
                    aria-describedby={error ? "newsletter-error" : undefined}
                  />
                  <Button
                    type="button"
                    disabled={!firstName.trim() || !emailIsValid || submitting}
                    onClick={submitNewsletter}
                    style={{ backgroundColor: "#2E9E6A", borderColor: "#2E9E6A" }}
                    className="min-h-16 w-full text-xl font-extrabold text-white shadow-[0_18px_45px_rgba(46,158,106,0.4)] hover:!bg-[#278a5c] hover:!border-[#278a5c] disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Send me the free newsletter →"}
                  </Button>
                </div>
                <p className="mt-3 text-sm font-bold text-white/70">Free · unsubscribe anytime · no account needed</p>
                {error && (
                  <p id="newsletter-error" className="mt-3 rounded-xl border border-red-300/40 bg-red-500/15 p-3 text-sm font-semibold text-red-100">
                    {error}
                  </p>
                )}
              </div>

              <div className="mx-auto mt-10 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm font-bold text-white">Money you're owed</div>
                  <div className="mt-1 text-xs leading-5 text-[#B9CCE4]">Benefits, deadlines, and programs worth checking.</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm font-bold text-white">Scams to dodge</div>
                  <div className="mt-1 text-xs leading-5 text-[#B9CCE4]">Clear warnings before fraudsters reach your wallet.</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm font-bold text-white">Social Security & Medicare</div>
                  <div className="mt-1 text-xs leading-5 text-[#B9CCE4]">What may change your check or your coverage.</div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

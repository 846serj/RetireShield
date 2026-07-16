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
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rg-card overflow-hidden">
          <Eyebrow>Retirement Shield newsletter</Eyebrow>
          <div className="mt-8 rounded-[2rem] bg-band p-5 sm:p-8">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand">
              Free, unsubscribe anytime
            </p>
            <h1 className="mt-4 font-serif text-[2.4rem] font-semibold leading-tight text-ink sm:text-5xl">
              Practical retirement money help every Tuesday & Friday.
            </h1>
            <p className="mt-5 text-xl font-semibold leading-8 text-slate-700">
              Join Ellen Marsh and the free Retirement Shield newsletter for
              plain-English updates that help you protect your retirement.
            </p>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-3xl border border-brand/20 bg-white p-6 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-ink">
                You&apos;re in — check your inbox
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-700">
                Watch for Retirement Shield from Ellen Marsh every Tuesday &
                Friday. Add Ellen Marsh — Retirement Shield to your contacts so
                you don&apos;t miss it.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 text-lg font-bold text-ink">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  Money you&apos;re owed — benefits, deadlines, and programs worth
                  checking.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  Scams to dodge — clear warnings before fraudsters reach your
                  wallet.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  Social Security &amp; Medicare changes — what may affect your
                  check or coverage.
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="newsletter-first-name" className="sr-only">
                    First name
                  </label>
                  <input
                    id="newsletter-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="rg-input"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="rg-input"
                    aria-describedby={error ? "newsletter-error" : undefined}
                  />
                </div>
                <Button
                  type="button"
                  disabled={!firstName.trim() || !emailIsValid || submitting}
                  onClick={submitNewsletter}
                  className="disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send me the free newsletter"}
                </Button>
              </div>
              {error && (
                <p
                  id="newsletter-error"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-bad"
                >
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

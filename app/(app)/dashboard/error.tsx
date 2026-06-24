"use client";

import { Button } from "@/components/ui";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rg-page-shell">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <section className="rg-card" role="alert" aria-labelledby="dashboard-error-heading">
          <p className="rg-kicker">Dashboard unavailable</p>
          <h1 id="dashboard-error-heading" className="mt-3 text-4xl font-bold">We could not load your dashboard.</h1>
          <p className="mt-4 text-lg text-slate-700">Please try again. If it keeps happening, your score and account data are still safe.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={reset}>Try again</Button>
            <Button href="/quiz" variant="secondary">Retake the quiz</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

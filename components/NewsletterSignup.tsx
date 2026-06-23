import { Button } from "@/components/ui";

export function NewsletterSignup({ className = "" }: { className?: string }) {
  return (
    <section className={`rounded-[2rem] bg-ink p-6 text-white shadow-xl sm:p-8 lg:p-10 ${className}`} aria-labelledby="newsletter-heading">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">Retirement Watch</p>
          <h2 id="newsletter-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Get one calm retirement safety idea each week.</h2>
          <p className="mt-3 text-lg leading-8 text-white/75">No sales pressure. Just plain-English guides to help you protect income, avoid surprises, and watch over the people you love.</p>
        </div>
        <form className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <label className="sr-only" htmlFor="newsletter-signup-email">Email address</label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input id="newsletter-signup-email" name="email" type="email" required placeholder="Email address" className="min-h-14 rounded-xl border border-slate-300 px-4 text-base text-ink" />
            <Button type="submit" className="min-h-14 px-5 py-2 text-base">Subscribe</Button>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">By subscribing, you agree to receive educational emails from RetireShield. Unsubscribe anytime.</p>
        </form>
      </div>
    </section>
  );
}

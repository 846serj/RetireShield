import { Disclaimer, Eyebrow } from "@/components/ui";

export default function RefundPolicy() {
  return (
    <div className="rg-page-shell">
      <article className="mx-auto max-w-3xl px-4 py-12 text-lg leading-8 text-slate-700 sm:py-16">
        <div className="rg-card">
          <Eyebrow>Refunds</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold text-ink sm:text-5xl">Refund Policy</h1>
          <p className="mb-8 text-sm font-medium text-slate-500">Last updated: June 30, 2026</p>

          <p className="mb-6 font-semibold text-slate-800">Effective date: June 30, 2026</p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">Free trial</h2>
          <p className="mb-6">
            Plus and Premium start with a <strong>7-day free trial</strong>. If you cancel before the trial ends,
            <strong> you will not be charged.</strong>
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">Automatic renewal</h2>
          <p className="mb-6">
            If you do not cancel before the trial ends, your subscription begins and your payment method is charged
            automatically: <strong>$19/month</strong> or <strong>$190/year</strong> for Plus, or <strong>$39/month</strong> or
            <strong> $390/year</strong> for Premium. Your subscription renews automatically at the then-current price until
            you cancel. We send a reminder email before the first paid charge.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">Refunds</h2>
          <p className="mb-6">
            <strong>Charges already made are non-refundable.</strong> You can cancel at any time, and cancellation stops all
            <strong> future</strong> charges. You keep access through the end of the period you already paid for. We do not
            provide partial or prorated refunds for the current term, except where required by applicable law.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">How to cancel</h2>
          <p className="mb-6">
            Cancel through the subscription management portal, available from your dashboard and from billing emails. If you
            have trouble canceling, email business@clarkbros.com and we will help.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">Contact</h2>
          <p>Questions about this Refund Policy can be sent to business@clarkbros.com.</p>
        </div>
        <Disclaimer className="mt-8" />
      </article>
    </div>
  );
}

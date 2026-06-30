import { Disclaimer, Eyebrow } from "@/components/ui";

export default function Terms() {
  return (
    <div className="rg-page-shell">
      <article className="mx-auto max-w-3xl px-4 py-12 text-lg leading-8 text-slate-700 sm:py-16">
        <div className="rg-card">
          <Eyebrow>Terms</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold text-ink sm:text-5xl">Terms of Service</h1>
          <p className="mb-8 text-sm font-medium text-slate-500">Last updated: June 30, 2026</p>

          <p className="mb-6 font-semibold text-slate-800">Effective date: June 30, 2026</p>
          <p className="mb-6">
            These Terms of Service (&quot;Terms&quot;) are an agreement between you and RetireShield (&quot;RetireShield,&quot;
            &quot;we,&quot; &quot;us&quot;). They govern your use of the RetireShield website, Safety Score quiz, account features,
            subscriptions, emails, and related services (the &quot;Service&quot;). By using the Service or subscribing, you agree
            to these Terms. If you do not agree, do not use the Service.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">1. Education only — not financial, tax, or legal advice</h2>
          <p className="mb-6">
            RetireShield provides general educational and informational content about retirement readiness, including a
            Retirement Safety Score and related materials. <strong>It is not financial, investment, tax, insurance, or legal
            advice, and it is not a recommendation to buy, sell, or hold any security or product.</strong> We are not a broker,
            dealer, investment adviser, insurance producer, attorney, tax professional, or fiduciary, and using the Service
            does not create any advisory, fiduciary, attorney-client, tax-preparer, or professional relationship. Always
            consult qualified, licensed professionals before making financial, tax, legal, insurance, or investment
            decisions. Your Safety Score and suggested actions are illustrative and based on the information you provide.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">2. Eligibility</h2>
          <p className="mb-6">You must be at least 18 years old and located in the United States to use the Service.</p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">3. Your account</h2>
          <p className="mb-6">
            Some features require an account, which you access by a secure email sign-in link. You are responsible for the
            email account you use to sign in, for keeping that email account secure, and for all activity under your
            RetireShield account.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">4. Subscriptions, free trial, and automatic renewal</h2>
          <p className="mb-4">Certain features require a paid Plus or Premium subscription. Concierge is a talk-to-sales offering.</p>
          <ul className="mb-6 list-disc space-y-3 pl-6">
            <li>
              <strong>Free trial.</strong> Plus and Premium are offered with a <strong>7-day free trial</strong>. If you do not cancel
              before the trial ends, your subscription will begin and your payment method will be charged automatically.
            </li>
            <li>
              <strong>Price and billing.</strong> After the trial, Plus is <strong>$19 per month</strong> or <strong>$190 per year</strong>.
              Premium is <strong>$39 per month</strong> or <strong>$390 per year</strong>. Annual billing is two months free versus
              monthly billing.
            </li>
            <li>
              <strong>Automatic renewal.</strong> <strong>Your subscription renews automatically, and your payment method will be
              charged at the then-current price until you cancel.</strong> You authorize us and our payment processor to charge
              your payment method on each renewal.
            </li>
            <li>
              <strong>Reminder.</strong> We will send a reminder by email before your free trial converts to a paid charge.
            </li>
            <li>
              <strong>How to cancel.</strong> You can cancel at any time through the subscription management portal, reachable
              from your dashboard and from billing emails. Cancellation stops future charges. See the Refund Policy for how
              cancellation affects charges already made.
            </li>
          </ul>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">5. Payments</h2>
          <p className="mb-6">
            Payments are processed by Stripe. We do not store your full card number. You agree to provide accurate billing
            information and authorize the charges described during checkout and in these Terms.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">6. Acceptable use</h2>
          <p className="mb-6">
            You agree not to misuse the Service, including by attempting to access it unlawfully, disrupting it, scraping or
            copying it at scale, reverse engineering it, reselling it, submitting false or harmful content, or relying on it
            as a substitute for professional advice.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">7. Intellectual property</h2>
          <p className="mb-6">
            The Service and its content are owned by RetireShield or its licensors and protected by law. We grant you a
            limited, personal, non-transferable, non-exclusive license to use the Service for your own personal,
            non-commercial use, subject to these Terms.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">8. Disclaimers</h2>
          <p className="mb-6">
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, express or implied,
            including accuracy, completeness, merchantability, fitness for a particular purpose, non-infringement, or that
            the Service will be uninterrupted or error-free. We do not warrant any particular financial outcome.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">9. Limitation of liability</h2>
          <p className="mb-6">
            To the fullest extent permitted by law, RetireShield will not be liable for any indirect, incidental, special,
            consequential, exemplary, or punitive damages, or for any loss arising from financial decisions you make. Our
            total liability for any claim relating to the Service will not exceed the amount you paid us in the 12 months
            before the claim.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">10. Indemnification</h2>
          <p className="mb-6">
            You agree to indemnify and hold harmless RetireShield from claims, losses, liabilities, damages, costs, and
            expenses arising out of your misuse of the Service, your content, or your violation of these Terms.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">11. Governing law and disputes</h2>
          <p className="mb-6">
            These Terms are governed by the laws of the <strong>State of Texas</strong>, without regard to conflict-of-laws
            rules. You and RetireShield agree that disputes will be brought in the state or federal courts located in Texas,
            unless applicable law requires otherwise.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">12. Changes</h2>
          <p className="mb-6">
            We may update these Terms from time to time. Material changes will be posted here with a new effective date and,
            where required, communicated to you. Continued use after changes means you accept the updated Terms.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">13. Contact</h2>
          <p>Questions about these Terms can be sent to business@clarkbros.com.</p>
        </div>
        <Disclaimer className="mt-8" />
      </article>
    </div>
  );
}

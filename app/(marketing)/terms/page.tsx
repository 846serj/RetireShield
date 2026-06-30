import { Disclaimer, Eyebrow } from "@/components/ui";

export default function Terms() {
  return (
    <div className="rg-page-shell">
      <article className="mx-auto max-w-3xl px-4 py-12 text-lg leading-8 text-slate-700 sm:py-16">
        <div className="rg-card">
          <Eyebrow>Terms</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold text-ink sm:text-5xl">Terms of Service</h1>
          <p className="mb-8 text-sm font-medium text-slate-500">Last updated: June 29, 2026</p>

          <p className="mb-6 font-semibold text-slate-800">Effective date: June 29, 2026</p>
          <p className="mb-6">
            These Terms of Service (&quot;Terms&quot;) are an agreement between you and American Signal Media, LLC
            (&quot;RetireShield,&quot; &quot;we,&quot; &quot;us&quot;). They govern your use of the RetireShield website and
            services (the &quot;Service&quot;). By using the Service, you agree to these Terms. If you do not agree, do not
            use the Service.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">1. Education only — not financial, tax, or legal advice</h2>
          <p className="mb-6">
            RetireShield provides general educational and informational content about retirement readiness, including a
            Retirement Safety Score and related materials. <strong>It is not financial, investment, tax, insurance, or
            legal advice, and it is not a recommendation to buy, sell, or hold any security or product.</strong> We are
            not a broker, dealer, investment adviser, or fiduciary, and using the Service does not create any advisory or
            fiduciary relationship. Always consult a qualified, licensed professional before making financial decisions.
            Your Safety Score and any suggested actions are illustrative and based solely on the information you provide.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">2. Eligibility</h2>
          <p className="mb-6">You must be at least 18 years old and a U.S. resident to use the Service.</p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">3. The service</h2>
          <p className="mb-6">
            RetireShield currently provides a free educational Retirement Safety Score and optional email updates.
            <strong> We do not currently offer paid subscriptions.</strong> If we introduce paid features in the future,
            the applicable price, billing, free-trial, and automatic-renewal terms will be presented to you before you
            are charged.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">4. Acceptable use</h2>
          <p className="mb-6">
            You agree not to misuse the Service, including by attempting to access it unlawfully, disrupting it, scraping
            it, reselling it, or relying on it as a substitute for professional advice.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">5. Intellectual property</h2>
          <p className="mb-6">
            The Service and its content are owned by American Signal Media, LLC and protected by law. We grant you a
            limited, personal, non-transferable license to use the Service for your own personal, non-commercial use.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">6. Disclaimers</h2>
          <p className="mb-6">
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, express
            or implied, including accuracy, fitness for a particular purpose, or that the Service will be uninterrupted or
            error-free. We do not warrant any particular financial outcome.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">7. Limitation of liability</h2>
          <p className="mb-6">
            To the fullest extent permitted by law, American Signal Media, LLC will not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or for any loss arising from financial decisions you
            make. Our total liability for any claim relating to the Service will not exceed $100 or the amount you paid us
            in the 12 months before the claim, whichever is greater.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">8. Governing law and disputes</h2>
          <p className="mb-6">
            These Terms are governed by the laws of the <strong>State of Texas</strong>, without regard to its
            conflict-of-laws rules. Any dispute relating to these Terms or the Service will be resolved exclusively in the
            state or federal courts located in Texas, and you consent to their jurisdiction.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">9. Changes</h2>
          <p className="mb-6">
            We may update these Terms. Material changes will be posted here with a new effective date. Continued use after
            changes means you accept them.
          </p>

          <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">10. Contact</h2>
          <p>Questions: business@clarkbros.com — American Signal Media, LLC, 598 West Interstate 30, Royse City, TX 75189.</p>
        </div>
        <Disclaimer className="mt-8" />
      </article>
    </div>
  );
}

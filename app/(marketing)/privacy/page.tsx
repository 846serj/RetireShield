import { Disclaimer, Eyebrow } from "@/components/ui";

export default function Privacy() {
  return (
    <div className="rg-page-shell">
      <article className="mx-auto max-w-3xl px-4 py-12 text-lg leading-8 text-slate-700 sm:py-16">
        <div className="rg-card">
          <Eyebrow>Privacy</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold text-ink sm:text-5xl">Privacy Policy</h1>
      <p className="mb-8 text-sm font-medium text-slate-500">Last updated: [DATE]</p>

      <p className="mb-6 font-semibold text-slate-800">Effective date: [DATE]</p>
      <p className="mb-6">
        This Privacy Policy explains how [LEGAL ENTITY NAME] (&quot;RetireShield,&quot; &quot;we&quot;) collects, uses, and shares
        information when you use the Service.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">1. Information we collect</h2>
      <ul className="mb-6 list-disc space-y-3 pl-6">
        <li>
          <strong>Information you give us:</strong> your email address and the answers you enter into the Safety Score
          quiz (such as age, retirement status, income and expense ranges, savings range, and your state). We do not ask
          for account numbers or sensitive identifiers, and we do not link to your financial accounts.
        </li>
        <li><strong>Account information:</strong> the email you use to sign in.</li>
        <li>
          <strong>Payment information:</strong> processed by Stripe. We receive limited billing details and subscription
          status; <strong>we do not store your full card number.</strong>
        </li>
        <li>
          <strong>Usage information:</strong> basic analytics about how you use the site (pages viewed, actions taken),
          collected to measure and improve the Service.
        </li>
      </ul>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">2. How we use your information</h2>
      <p className="mb-6">
        To provide your Safety Score and account, operate subscriptions and billing, send you service and marketing emails
        you can opt out of, measure and improve the Service, and meet legal obligations.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">3. How we share information (service providers)</h2>
      <p className="mb-4">We share information with vendors who process it on our behalf, including:</p>
      <ul className="mb-6 list-disc space-y-3 pl-6">
        <li><strong>Supabase</strong> — secure database and authentication.</li>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li><strong>Beehiiv</strong> — email delivery and list management.</li>
        <li><strong>PostHog</strong> — product analytics.</li>
        <li><strong>Our hosting provider</strong> — to run the Service.</li>
      </ul>
      <p className="mb-6">We do <strong>not</strong> sell your personal information. We may disclose information if required by law.</p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">4. Cookies and analytics</h2>
      <p className="mb-6">
        We use cookies and similar technologies for essential functionality and analytics. You can control cookies through
        your browser settings.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">5. Email choices</h2>
      <p className="mb-6">
        You can unsubscribe from marketing emails at any time using the link in those emails. We may still send
        service-related messages (for example, billing and security notices).
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">6. Data retention</h2>
      <p className="mb-6">
        We keep your information for as long as your account is active or as needed to provide the Service and meet legal
        obligations, then delete or de-identify it.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">7. Your choices and rights</h2>
      <p className="mb-6">
        You may request access to, correction of, or deletion of your personal information by emailing
        business@clarkbros.com. <strong>[ATTORNEY TO CONFIRM any state-specific privacy rights and required language.]</strong>
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">8. Children</h2>
      <p className="mb-6">
        The Service is intended for adults 18 and older and is not directed to children. We do not knowingly collect
        information from anyone under 18.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">9. Security</h2>
      <p className="mb-6">
        We use reasonable administrative and technical safeguards to protect your information, but no system is perfectly
        secure.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">10. Changes</h2>
      <p className="mb-6">We may update this Policy and will post changes here with a new effective date.</p>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-ink">11. Contact</h2>
      <p>business@clarkbros.com — [LEGAL ENTITY NAME], [BUSINESS MAILING ADDRESS].</p>
        </div>
        <Disclaimer className="mt-8" />
      </article>
    </div>
  );
}

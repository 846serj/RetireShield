import { Disclaimer, Eyebrow } from "@/components/ui";

export default function Privacy() {
  return (
    <div className="rg-page-shell">
      <article className="mx-auto max-w-3xl px-4 py-12 text-lg leading-8 text-slate-700 sm:py-16">
        <div className="rg-card">
          <Eyebrow>Privacy</Eyebrow>
          <h1 className="mb-2 mt-3 text-4xl font-bold text-ink sm:text-5xl">Privacy Policy</h1>
          <p className="mb-8 text-sm font-medium text-slate-500">Last updated: June 30, 2026</p>

          <p className="mb-6 font-semibold text-slate-800">Effective date: June 30, 2026</p>
          <p className="mb-6">
            This Privacy Policy explains how RetireShield (&quot;RetireShield,&quot; &quot;we,&quot; &quot;us&quot;) collects,
            uses, and shares information when you use our website, Safety Score quiz, account features,
            subscriptions, emails, and related services (the &quot;Service&quot;).
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">1. Information we collect</h2>
          <ul className="mb-6 list-disc space-y-3 pl-6">
            <li>
              <strong>Information you provide:</strong> your email address and the answers you enter into the Safety Score
              quiz or account forms, such as age range, retirement status, income and expense ranges, savings range,
              state, planning preferences, and trusted contact information if you choose to provide it.
            </li>
            <li>
              <strong>Account information:</strong> the email address you use to sign in and basic account, subscription,
              and preference settings.
            </li>
            <li>
              <strong>Payment information:</strong> payments are processed by Stripe. We receive limited billing details,
              payment status, and subscription status; <strong>we do not store your full card number.</strong>
            </li>
            <li>
              <strong>Usage information:</strong> basic analytics about pages viewed, actions taken, device/browser type,
              and approximate location inferred from your connection so we can operate, protect, and improve the Service.
            </li>
          </ul>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">2. How we use your information</h2>
          <p className="mb-6">
            We use your information to provide and personalize the Service, calculate and save your Safety Score, operate
            accounts and subscriptions, process payments, send service messages, send marketing emails you can opt out of,
            improve product quality, prevent misuse, and comply with legal obligations.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">3. How we share information</h2>
          <p className="mb-4">We share information with service providers that process it on our behalf, including:</p>
          <ul className="mb-6 list-disc space-y-3 pl-6">
            <li><strong>Supabase</strong> for database, authentication, and account infrastructure.</li>
            <li><strong>Stripe</strong> for payment processing, checkout, invoices, and subscription management.</li>
            <li><strong>Beehiiv</strong> for email delivery and list management.</li>
            <li><strong>PostHog</strong> for product analytics.</li>
            <li><strong>Hosting and infrastructure providers</strong> that help us run and secure the Service.</li>
          </ul>
          <p className="mb-6">
            We do <strong>not</strong> sell your personal information. We may disclose information if required by law, to
            protect rights and safety, or as part of a merger, acquisition, financing, or sale of assets.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">4. Cookies and analytics</h2>
          <p className="mb-6">
            We use cookies and similar technologies for essential functionality, security, preferences, and analytics. You
            can control cookies through your browser settings, but disabling cookies may affect some features.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">5. Email choices</h2>
          <p className="mb-6">
            You can unsubscribe from marketing emails at any time using the link in those emails. We may still send
            service-related messages, including account, billing, security, and transactional notices.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">6. Data retention</h2>
          <p className="mb-6">
            We keep personal information for as long as needed to provide the Service, maintain your account, comply with
            legal obligations, resolve disputes, enforce agreements, and protect the Service. When information is no longer
            needed, we delete or de-identify it where practical.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">7. Your choices and rights</h2>
          <p className="mb-6">
            You may request access to, correction of, or deletion of your personal information by emailing
            business@clarkbros.com. Depending on where you live, you may have additional privacy rights under applicable
            law, and we will respond to eligible requests as required.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">8. Children</h2>
          <p className="mb-6">
            The Service is intended for adults 18 and older and is not directed to children. We do not knowingly collect
            personal information from anyone under 18.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">9. Security</h2>
          <p className="mb-6">
            We use reasonable administrative, technical, and organizational safeguards designed to protect your information,
            but no website, app, database, or transmission method is perfectly secure.
          </p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">10. Changes</h2>
          <p className="mb-6">We may update this Policy from time to time. We will post the updated version here with a new effective date.</p>

          <h2 className="mb-4 mt-10 text-2xl font-bold text-ink">11. Contact</h2>
          <p>Questions about this Privacy Policy can be sent to business@clarkbros.com.</p>
        </div>
        <Disclaimer className="mt-8" />
      </article>
    </div>
  );
}

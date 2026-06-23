# RetireShield v0 — starter

A runnable Next.js app for the **free Retirement Safety Score** wedge: landing → 9-question quiz →
score + 4 sub-scores + 3 actions, gated behind email capture. Education only, no account/brokerage linking.

This is the self-contained free-Score half of the launch. The monetized half (accounts, Stripe
3-day-trial→annual, paid features, the auto-renew compliance flow) is **stubbed** here and built per
`../RetireShield-v0-Launch-Runbook.md` — those need your accounts and a lawyer, so they aren't pre-wired.

## Run it locally (works with zero setup)

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # scoring unit tests (Node 22+)
```

With no env vars, captured emails just log to the server console, so you can demo the whole flow immediately.

## Persist leads (optional, ~5 min)

1. Create a Supabase project.
2. In Supabase → SQL editor, run `supabase-schema.sql`.
3. Copy `.env.example` → `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
4. Restart `npm run dev`. Leads now land in the `leads` table.

## Deploy

Push to GitHub → import to Vercel → add the env vars → point your domain. Then connect the funnel: every
FB page links to `yourdomain.com/quiz?utm_source=fb&utm_campaign=<pagename>`.

## What's here

```
app/page.tsx          landing ("Get your free Safety Score")
app/quiz/page.tsx     the quiz + result + email gate (all client-side)
app/api/lead/route.ts saves the lead (Supabase if configured, else console)
lib/questions.ts      the 9 questions (edit freely)
lib/scoring.ts        pure scoring logic — overall + 4 sub-scores + 3 actions
lib/scoring.test.ts   sanity tests
supabase-schema.sql   the leads table
```


## Supabase Auth email troubleshooting

The login screen uses Supabase passwordless magic links, not a separate password signup form. It calls
`supabase.auth.signInWithOtp()` with `shouldCreateUser: true`, so a first-time email address is created
when Supabase successfully sends the link.

If the UI says the link was sent but no email arrives, check these items first:

1. Render must define `NEXT_PUBLIC_BASE_URL` as the exact public site origin, for this app:
   `https://RetireShield.com`. Do not include a trailing slash or path.
2. Supabase → Authentication → URL Configuration must use the same production origin as the Site URL and
   must allow `https://RetireShield.com/auth/callback` (and any custom-domain callback) in Redirect URLs.
   If the email link still points at localhost, redeploy after changing the Render environment variable because
   `NEXT_PUBLIC_*` values are baked into the client bundle at build time.
3. Supabase → Authentication → Logs is the source of truth for delivery failures, SMTP handoff errors,
   redirect-url rejections, and email rate-limit errors.
4. For production, configure custom SMTP in Supabase. Supabase's built-in auth email service is intended for
   testing and has tight delivery/rate limitations.

## Phase 3–6 scaffold (now included — add keys + a lawyer)

These files are written but **not runtime-verified** (they need the new deps + your Stripe/Supabase keys):

```
lib/supabase/{client,server}.ts   browser + server Supabase clients (@supabase/ssr)
middleware.ts                     refreshes the auth session
app/login + app/auth/callback     magic-link sign-in
app/dashboard                     authed; shows saved score, gates paid section
app/upgrade                       pricing + CONSENT checkbox + auto-renew terms (Phase 6)
app/api/checkout                  Stripe Checkout (subscription, 3-day trial on annual price)
app/api/portal                    Stripe Customer Portal (one-click cancel)
app/api/stripe/webhook            syncs the subscriptions table
app/terms, app/privacy, app/refund-policy   PLACEHOLDER legal pages (lawyer must finalize)
lib/stripe.ts, lib/subscription.ts, lib/email.ts
```

To activate: `npm install` (pulls in `stripe` + `@supabase/ssr`), run the full `supabase-schema.sql`,
run `npm run stripe:setup` with `STRIPE_SECRET_KEY` set to create the `RetireShield Premium` product, the annual $199 price with `trial_period_days=3`, the monthly $29 price, and a Customer Portal configuration. Add the printed `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_MONTHLY`, and `STRIPE_PORTAL_CONFIGURATION` env vars, then add the webhook endpoint + signing secret. Then test with Stripe test cards.

Stripe Dashboard checklist before live launch:

- Billing → Subscriptions and emails: keep the trial-ending reminder email turned ON.
- Customer Portal: use the generated configuration or verify one-click cancellation is enabled.
- Products: confirm `RetireShield Premium` has the $199/year price with a 3-day trial and the $29/month price.

**Hard gate (Phase 6):** a lawyer must review the `/upgrade` copy, the consent checkbox, the trial-ending
reminder, the one-click cancel, and the three legal pages **before you switch Stripe to live mode.**

Known TODO: the quiz is anonymous (email-gated), so a freshly created account starts with no saved score —
add a step that links the just-taken Score to the new `scores` row on signup. Noted in the runbook.

## Phase 5 paid features — BUILT (real, not placeholders)

The trial now unlocks substantive features:

```
lib/actionPlan.ts     generates a personalized, prioritized plan from the user's answers + sub-scores
lib/alerts.ts         matches content_items to the user's state, age, and top worry
lib/usStates.ts       state list (a state question was added to the quiz for alert matching)
app/api/score-save    persists an authed user's score
components/ScoreHydrator.tsx  "claims" an anonymous Score to a new account on first dashboard load
seed-content.sql      16 example alerts (run after supabase-schema.sql)
```

The dashboard now renders the real action plan + matched alerts for trialing/active users. To activate:
run `seed-content.sql`, and the rest works once auth + Stripe are wired.

End-to-end flow that now functions: take quiz (incl. state) → email → sign up → score auto-claimed →
start trial → see your prioritized action plan + alerts matched to your state/age/worry.

## Still to build (per the runbook)

- ESP lifecycle emails (wire `lib/email.ts`) — Phase 7
- PostHog analytics for view→lead / trial→paid — Phase 8
- Real alert content fed from your newsroom (replace the 16 seeded examples)

> Guardrails (CLAUDE.md §5): education not advice, no brokerage linking, disclosed auto-renew, lawyer review before launch.

import { getSubscriptionAccess } from "@/lib/subscription";
import { getMatchedAlerts } from "@/lib/alerts";
import type { Answers } from "@/lib/scoring";
import { buildFinancialPicture, type SpendingAccount, type SpendingTransaction } from "@/lib/engine/spending";
import { buildPortfolioAnalysis, type FinancialAccountRow, type HoldingRow, type SecurityRow } from "@/lib/engine/portfolio";
import AlertFeed from "@/components/AlertFeed";
import PushNotifications from "@/components/PushNotifications";
import LockedTeaser from "@/components/LockedTeaser";
import { Button, Eyebrow } from "@/components/ui";
import { getLatestScore, requireUser, saveTrustedContact } from "../dashboard/_lib/dashboard";

function TrustedContacts({ contacts }: { contacts: any[] }) {
  return <section className="rg-card mb-5" aria-labelledby="trusted-contacts-heading"><div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]"><div><p className="rg-kicker">Scam Shield</p><h2 id="trusted-contacts-heading" className="mt-1 text-2xl font-extrabold">Trusted contact alerts</h2><p className="mt-3 text-slate-700">Add a trusted contact for high-risk scam alerts.</p><div className="mt-4 space-y-3">{contacts.length > 0 ? contacts.map((contact) => <div key={contact.email} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-ink">{contact.name}</p><p className="text-sm text-slate-600">{contact.email}</p><p className={`mt-2 text-xs font-extrabold uppercase tracking-[0.14em] ${contact.consent_at ? "text-emerald-700" : "text-amber-700"}`}>{contact.consent_at ? "Consent enabled" : "Consent not enabled"}</p></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No trusted contact saved yet.</p>}</div></div><form action={saveTrustedContact} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="block text-sm font-bold text-slate-700" htmlFor="trusted-name">Name</label><input id="trusted-name" name="name" required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Trusted contact name" /><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="trusted-email">Email</label><input id="trusted-email" name="email" type="email" required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="name@example.com" /><label className="mt-4 flex gap-3 rounded-2xl bg-band p-4 text-sm font-semibold text-slate-700"><input name="consent" type="checkbox" className="mt-1" />I consent to RetireShield emailing this trusted contact if high-risk scam activity is detected.</label><Button className="mt-5 w-full justify-center">Save trusted contact</Button></form></div></section>;
}

export default async function MonitoringPage() {
  const { supabase, user } = await requireUser("/alerts");
  const access = await getSubscriptionAccess(user.id);
  if (!access.active) return <div className="mx-auto max-w-5xl py-8"><LockedTeaser eyebrow="Alerts + trusted contacts" title="Unlock matched monitoring" description="Get alerts matched to your state, age, and worries, plus trusted-contact scam alerts."><AlertFeed alerts={[]} /></LockedTeaser></div>;
  const latest = await getLatestScore(supabase, user.id);
  const answers = latest?.answers as Answers | undefined;
  const [transactionsResult, accountsResult, holdingsResult, securitiesResult, trustedContactsResult, historyResult] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id), supabase.from("financial_accounts").select("*").eq("user_id", user.id), supabase.from("holdings").select("*").eq("user_id", user.id), supabase.from("securities").select("*"), supabase.from("trusted_contacts").select("name,email,consent_at").eq("user_id", user.id).order("created_at", { ascending: false }), supabase.from("scores").select("answers,overall,created_at").eq("user_id", user.id).not("answers", "is", null).order("created_at", { ascending: true }),
  ]);
  const transactions = (transactionsResult.data ?? []) as SpendingTransaction[];
  const accounts = (accountsResult.data ?? []) as SpendingAccount[];
  const financialPicture = buildFinancialPicture(transactions, accounts);
  const portfolioAnalysis = buildPortfolioAnalysis((holdingsResult.data ?? []) as HoldingRow[], (securitiesResult.data ?? []) as SecurityRow[], accounts as FinancialAccountRow[]);
  const alerts = answers ? await getMatchedAlerts(supabase, { state: answers.state, age: answers.age, worry: answers.worry }, 12, { transactions, accounts, financialPicture, portfolioAnalysis, scoreHistory: historyResult.data ?? [] }) : [];
  return <div className="mx-auto max-w-6xl py-8"><div className="mb-5"><Eyebrow>Retirement Watch</Eyebrow><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Monitoring</h1></div><PushNotifications /><AlertFeed alerts={alerts} /><TrustedContacts contacts={trustedContactsResult.data ?? []} /></div>;
}

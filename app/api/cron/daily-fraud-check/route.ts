import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { detectFraudFlags } from "@/lib/engine/fraud";
import type { SpendingAccount, SpendingTransaction } from "@/lib/engine/spending";
import { sendTrustedContactFraudEmail } from "@/lib/email";

const PAGE_SIZE = 100;

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

async function listAllUsers(supabase: ReturnType<typeof createServiceClient>) {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < PAGE_SIZE) break;
  }
  return users;
}

async function checkUser(supabase: ReturnType<typeof createServiceClient>, user: User) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const [transactionsResult, accountsResult, contactsResult] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("financial_accounts").select("*").eq("user_id", user.id),
    supabase.from("trusted_contacts").select("email,consent_at").eq("user_id", user.id).not("consent_at", "is", null),
  ]);
  const flags = detectFraudFlags((transactionsResult.data ?? []) as SpendingTransaction[], { accounts: (accountsResult.data ?? []) as SpendingAccount[] })
    .filter((flag) => flag.riskScore >= 80 && (!flag.transaction.date || flag.transaction.date >= since));
  const contacts = (contactsResult.data ?? []) as { email?: string | null; consent_at?: string | null }[];
  if (flags.length > 0) {
    await Promise.all(contacts.filter((contact) => contact.email && contact.consent_at).map((contact) => sendTrustedContactFraudEmail(contact.email!, {
      memberEmail: user.email,
      flagCount: flags.length,
      topReason: flags[0].reason,
      topAdvice: flags[0].advice,
    })));
  }
  return { userId: user.id, flags: flags.length, contactsNotified: flags.length > 0 ? contacts.filter((contact) => contact.email && contact.consent_at).length : 0 };
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: "missing service role" }, { status: 500 });

  const supabase = createServiceClient();
  const users = await listAllUsers(supabase);
  const results = [];
  for (const user of users) results.push(await checkUser(supabase, user));
  return NextResponse.json({ ok: true, users: users.length, results });
}

export async function GET(req: Request) {
  return POST(req);
}

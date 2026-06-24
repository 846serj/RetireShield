import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaid } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

async function createLinkToken() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "RetireShield",
    products: [Products.Transactions, Products.Investments],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: `${process.env.APP_URL}/api/plaid/webhook`,
  });

  return NextResponse.json({ link_token: data.link_token });
}

export const POST = createLinkToken;
export const GET = createLinkToken;

import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { decrypt } from "@/lib/crypto";
import { plaid } from "@/lib/plaid";
import { checkPlaidRateLimit, logPlaidError, withPlaidLogging } from "@/lib/plaidHelpers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function createLinkToken(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = checkPlaidRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const itemId = url.searchParams.get("item_id");
  let accessToken: string | null = null;

  if (itemId) {
    const service = createServiceClient();
    const { data: item, error } = await service
      .from("plaid_items")
      .select("access_token_encrypted")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!item) return NextResponse.json({ error: "Plaid item not found" }, { status: 404 });
    accessToken = decrypt(item.access_token_encrypted);
  }

  try {
    const baseRequest = {
      user: { client_user_id: user.id },
      client_name: "RetireShield",
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: `${process.env.APP_URL}/api/plaid/webhook`,
    };
    const plaidRequest = accessToken
      ? { ...baseRequest, access_token: accessToken }
      : { ...baseRequest, products: [Products.Transactions, Products.Investments] };

    const { data } = await withPlaidLogging("linkTokenCreate", { user_id: user.id, mode: accessToken ? "update" : "create" }, () =>
      plaid.linkTokenCreate(plaidRequest as any)
    );

    return NextResponse.json({ link_token: data.link_token });
  } catch (error) {
    logPlaidError("linkTokenCreate.response", error, { user_id: user.id, item_id: itemId });
    return NextResponse.json({ error: "Could not create a Plaid link token" }, { status: 502 });
  }
}

export const POST = createLinkToken;
export const GET = createLinkToken;

import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { plaid } from "@/lib/plaid";
import { checkPlaidRateLimit, logPlaidError, withPlaidLogging } from "@/lib/plaidHelpers";
import { syncItem } from "@/lib/plaidSync";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = checkPlaidRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const { public_token } = await request.json();
  if (!public_token || typeof public_token !== "string") {
    return NextResponse.json({ error: "public_token is required" }, { status: 400 });
  }

  try {
    const { data: exchange } = await withPlaidLogging("itemPublicTokenExchange", { user_id: user.id }, () =>
      plaid.itemPublicTokenExchange({ public_token })
    );
    const { data: itemData } = await withPlaidLogging("itemGet", { user_id: user.id, item_id: exchange.item_id }, () =>
      plaid.itemGet({ access_token: exchange.access_token })
    );
    let institutionName: string | null = null;
    let institutionId = itemData.item.institution_id ?? null;

    if (institutionId) {
      try {
        const { data: institution } = await withPlaidLogging("institutionsGetById", { user_id: user.id, institution_id: institutionId }, () =>
          plaid.institutionsGetById({ institution_id: institutionId, country_codes: ["US"] as any })
        );
        institutionName = institution.institution.name ?? null;
      } catch (error) {
        logPlaidError("institutionsGetById.non_blocking_failure", error, { user_id: user.id, institution_id: institutionId });
      }
    }

    const service = createServiceClient();
    const row = {
      user_id: user.id,
      item_id: exchange.item_id,
      access_token_encrypted: encrypt(exchange.access_token),
      institution_name: institutionName,
      institution_id: institutionId,
      status: "active",
    };

    const { data: item, error } = await service.from("plaid_items").upsert(row, { onConflict: "item_id" }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await syncItem(item);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logPlaidError("plaidExchange.response", error, { user_id: user.id });
    return NextResponse.json({ error: "Could not connect that institution" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { plaid } from "@/lib/plaid";
import { syncItem } from "@/lib/plaidSync";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { public_token } = await request.json();
  if (!public_token || typeof public_token !== "string") {
    return NextResponse.json({ error: "public_token is required" }, { status: 400 });
  }

  const { data: exchange } = await plaid.itemPublicTokenExchange({ public_token });
  const { data: itemData } = await plaid.itemGet({ access_token: exchange.access_token });
  let institutionName: string | null = null;
  let institutionId = itemData.item.institution_id ?? null;

  if (institutionId) {
    try {
      const { data: institution } = await plaid.institutionsGetById({ institution_id: institutionId, country_codes: ["US"] as any });
      institutionName = institution.institution.name ?? null;
    } catch (error) {
      console.error("Plaid institution lookup failed:", error);
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
}

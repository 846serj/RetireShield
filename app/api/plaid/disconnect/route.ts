import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { plaid } from "@/lib/plaid";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id } = await request.json();
  if (!item_id || typeof item_id !== "string") return NextResponse.json({ error: "item_id is required" }, { status: 400 });

  const service = createServiceClient();
  const { data: item, error } = await service.from("plaid_items").select("*").eq("user_id", user.id).eq("item_id", item_id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await plaid.itemRemove({ access_token: decrypt(item.access_token_encrypted) });

  const { data: accounts } = await service
    .from("financial_accounts")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("item_id", item_id);
  const accountIds = (accounts ?? []).map((account: { account_id: string }) => account.account_id);

  if (accountIds.length > 0) {
    await service.from("transactions").delete().eq("user_id", user.id).in("account_id", accountIds);
    await service.from("holdings").delete().eq("user_id", user.id).in("account_id", accountIds);
  }
  await service.from("financial_accounts").delete().eq("user_id", user.id).eq("item_id", item_id);
  await service.from("plaid_items").delete().eq("user_id", user.id).eq("item_id", item_id);

  return NextResponse.json({ ok: true });
}

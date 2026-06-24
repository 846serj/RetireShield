import { NextResponse } from "next/server";
import { syncItem } from "@/lib/plaidSync";
import { createServiceClient } from "@/lib/supabase/server";

const TRANSACTION_CODES = new Set(["SYNC_UPDATES_AVAILABLE"]);
const INVESTMENT_TYPES = new Set(["INVESTMENTS_TRANSACTIONS", "HOLDINGS"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const itemId = body.item_id;
  const webhookType = body.webhook_type;
  const webhookCode = body.webhook_code;

  if (itemId && ((webhookType === "TRANSACTIONS" && TRANSACTION_CODES.has(webhookCode)) || INVESTMENT_TYPES.has(webhookType))) {
    const service = createServiceClient();
    const { data: item } = await service.from("plaid_items").select("*").eq("item_id", itemId).maybeSingle();
    if (item) {
      syncItem(item).catch((error) => console.error("Plaid webhook sync failed:", error));
    }
  }

  return NextResponse.json({ ok: true });
}

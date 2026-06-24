import { NextResponse } from "next/server";
import { checkPlaidRateLimit } from "@/lib/plaidHelpers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = checkPlaidRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const { item_id } = await request.json();
  if (!item_id || typeof item_id !== "string") return NextResponse.json({ error: "item_id is required" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from("plaid_items").update({ status: "active" }).eq("user_id", user.id).eq("item_id", item_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

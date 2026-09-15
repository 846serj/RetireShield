import { NextResponse } from "next/server";
import { fulfillBenefitsOrder, type BenefitsOrder } from "@/lib/benefitsOrders";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createServiceClient();
  const { data, error } = await db.from("benefits_orders").select("*")
    .eq("status", "paid")
    .or("purchase_email_status.in.(pending,failed),newsletter_status.in.(pending,failed)")
    .order("paid_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });

  let completed = 0;
  for (const order of (data || []) as BenefitsOrder[]) {
    try {
      await fulfillBenefitsOrder(order);
      completed += 1;
    } catch (fulfillmentError) {
      console.error("Benefits fulfillment retry failed", order.id, fulfillmentError);
    }
  }
  return NextResponse.json({ ok: true, checked: data?.length || 0, completed });
}

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { curateAlertsFromSource } from "@/lib/ai/alerts";
import { datedTriggerAlerts, generateDraftAlertsFromNewsroom } from "@/lib/alertGenerator";

function authorized(req: Request) {
  const user = process.env.ADMIN_BASIC_USER;
  const pass = process.env.ADMIN_BASIC_PASSWORD;
  if (!user || !pass) return false;
  const header = req.headers.get("authorization") ?? "";
  const [u, p] = Buffer.from(header.replace(/^Basic\s+/i, ""), "base64").toString().split(":");
  return u === user && p === pass;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Basic" } });
  const body = await req.json();
  if (body.action === "approve") {
    const items = Array.isArray(body.items) ? body.items : [];
    const rows = items.map((it: any) => ({ title: it.title, body: it.body, category: it.category, states: it.states ?? null, min_age: it.min_age ?? null, action_line: it.action_line, source_url: it.source_url ?? null, published_at: it.published_at ?? new Date().toISOString(), expires_at: it.expires_at ?? null, status: "approved" }));
    if (rows.length === 0) return NextResponse.json({ error: "No items" }, { status: 400 });
    const { data, error } = await createServiceClient().from("content_items").insert(rows).select("id,title");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag("content_items");
    return NextResponse.json({ inserted: data });
  }
  if (Array.isArray(body.newsroomItems)) {
    return NextResponse.json({ items: [...datedTriggerAlerts(), ...generateDraftAlertsFromNewsroom(body.newsroomItems)] });
  }
  const source = String(body.source ?? "");
  return NextResponse.json({ items: [...datedTriggerAlerts(), ...(await curateAlertsFromSource(source))] });
}

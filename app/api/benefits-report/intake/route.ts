import { NextResponse } from "next/server";
import { BENEFITS_REPORT_PRODUCT } from "@/lib/benefitsReport";
import { sendTransactionalEmail } from "@/lib/resend";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const ALLOWED = new Set(["state", "age", "marital", "household_size", "housing", "medicare_a", "medicare_b", "medicare_d", "ss_gross", "pension", "annuity", "wages", "va_income", "interest", "other_income", "unsure_income", "checking_savings", "cds", "stocks_bonds", "second_property", "unsure_savings", "rent_or_mortgage", "property_tax_year", "home_insurance_year", "heat_cool_monthly", "utilities_in_rent", "shutoff_notice", "med_premiums", "med_prescriptions", "med_doctor_dental", "med_otc", "med_devices", "med_transport", "med_home_care", "med_facility", "unsure_medical", "veteran", "service_era", "paying_for_care", "needs_help_daily", "has_snap", "has_liheap", "has_ssi", "has_va", "has_medicaid", "has_extra_help", "other_states", "former_names", "notes"]);

function cleanAnswers(input: unknown) {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const out: Record<string, string | boolean | number> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED.has(key)) continue;
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.max(0, Math.min(value, 100_000_000));
    else if (typeof value === "string") out[key] = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 2_000);
  }
  return out;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "We could not read those answers." }, { status: 400 }); }
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) || !/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "Use the link from your receipt." }, { status: 403 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "The form is not ready. Please contact support." }, { status: 503 });

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const paid = intent.status === "succeeded" && intent.amount_received >= intent.amount && !charge?.refunded && (charge?.amount_refunded ?? 0) < intent.amount_received;
    if (!paid || intent.metadata.product !== BENEFITS_REPORT_PRODUCT || intent.metadata.intake_token !== token) return NextResponse.json({ error: "We could not match this form to a paid report." }, { status: 403 });
    const clean = cleanAnswers(body.answers);
    const complete = body.complete === true;
    const db = createServiceClient();
    const { data: old } = await db.from("benefits_report_intakes").select("answers").eq("payment_intent_id", paymentIntentId).maybeSingle();
    const answers = { ...(old?.answers || {}), ...clean };
    const { error } = await db.from("benefits_report_intakes").upsert({ payment_intent_id: paymentIntentId, email: intent.receipt_email || "", first_name: intent.metadata.buyer_name || "", state: String(answers.state || intent.metadata.buyer_state || "").slice(0, 2), status: complete ? "complete" : "partial", answers, updated_at: new Date().toISOString() }, { onConflict: "payment_intent_id" });
    if (error) throw error;
    if (complete && process.env.BENEFITS_REPORT_NOTIFY_EMAIL) {
      await sendTransactionalEmail({ to: process.env.BENEFITS_REPORT_NOTIFY_EMAIL, subject: `Report intake ready: ${intent.metadata.buyer_name || "New buyer"}`, html: `<p>A Personal Benefits Report form is complete.</p><p>Payment: ${paymentIntentId}</p><p>State: ${String(answers.state || "not given")}</p>`, text: `A Personal Benefits Report form is complete.\nPayment: ${paymentIntentId}\nState: ${String(answers.state || "not given")}` });
    }
    return NextResponse.json({ ok: true, status: complete ? "complete" : "partial" });
  } catch (error) {
    console.error("benefits report intake failed", error);
    return NextResponse.json({ error: "We could not save your answers. Please try again." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { findBenefitsOrder, findBenefitsOrderByPayment, markBenefitsOrderPaid, markBenefitsOrderRefunded } from "@/lib/benefitsOrders";
import { paypalRequest } from "@/lib/paypal";

export async function POST(req: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return NextResponse.json({ error: "PayPal webhook is not configured." }, { status: 503 });
  const raw = await req.text();
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });
    if (verification.verification_status !== "SUCCESS") return NextResponse.json({ error: "Invalid PayPal signature." }, { status: 400 });

    const resource = event.resource || {};
    const captureId = event.event_type === "PAYMENT.CAPTURE.REFUNDED"
      ? String(resource.supplementary_data?.related_ids?.capture_id || "")
      : String(resource.id || "");
    const orderId = String(resource.supplementary_data?.related_ids?.order_id || "");
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && orderId && captureId) {
      const order = await findBenefitsOrder("paypal", orderId);
      if (order) {
        const cents = Math.round(Number(resource.amount?.value || 0) * 100);
        if (resource.amount?.currency_code === "USD" && cents === order.total_cents) await markBenefitsOrderPaid("paypal", orderId, captureId, cents);
      }
    } else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED" && captureId) {
      const order = await findBenefitsOrderByPayment("paypal", captureId);
      const refundCents = Math.round(Number(resource.amount?.value || 0) * 100);
      if (order && order.status === "paid" && refundCents >= order.total_cents) await markBenefitsOrderRefunded(order);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook failed", error);
    return NextResponse.json({ error: "PayPal webhook processing failed." }, { status: 500 });
  }
}

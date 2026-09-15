import { NextResponse } from "next/server";
import { benefitsThanksUrl, findBenefitsOrder, markBenefitsOrderPaid } from "@/lib/benefitsOrders";
import { paypalRequest } from "@/lib/paypal";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const paypalOrderId = typeof body.orderID === "string" ? body.orderID.replace(/[^A-Za-z0-9-]/g, "").slice(0, 80) : "";
  if (!paypalOrderId) return NextResponse.json({ error: "PayPal order was not found." }, { status: 400 });
  try {
    const order = await findBenefitsOrder("paypal", paypalOrderId);
    if (!order) return NextResponse.json({ error: "PayPal order was not found." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ redirect: benefitsThanksUrl(order) });
    const captured = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": `rs-benefits-capture-${paypalOrderId}` },
    });
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedCents = Math.round(Number(capture?.amount?.value || 0) * 100);
    if (capture?.status !== "COMPLETED" || capture?.amount?.currency_code !== "USD" || capturedCents !== order.total_cents) {
      throw new Error("PayPal did not return the expected completed payment.");
    }
    const paid = await markBenefitsOrderPaid("paypal", paypalOrderId, String(capture.id), capturedCents);
    return NextResponse.json({ redirect: benefitsThanksUrl(paid) });
  } catch (error) {
    console.error("PayPal Benefits Checklist capture failed", error);
    return NextResponse.json({ error: "PayPal could not finish the payment. You have not been charged twice. Please contact support if PayPal shows a charge." }, { status: 502 });
  }
}

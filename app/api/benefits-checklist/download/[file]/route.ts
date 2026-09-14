import { NextResponse } from "next/server";
import { BENEFITS_CHECKLIST_PRODUCT, BENEFITS_CHECKLIST_STORAGE_BUCKET, benefitsDownloadsForOrder } from "@/lib/benefitsChecklist";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { captureServerEvent } from "@/lib/posthogServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { file: string } }) {
  const url = new URL(req.url);
  const paymentIntentId = url.searchParams.get("payment_intent") || "";
  const token = url.searchParams.get("token") || "";

  if (!/^[-a-z]+$/.test(params.file) || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) || !/^[a-f0-9]{48}$/.test(token)) {
    return NextResponse.json({ error: "Invalid download link." }, { status: 400 });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const paid = intent.status === "succeeded" && intent.amount_received >= intent.amount;
    const refunded = Boolean(charge?.refunded) || (charge?.amount_refunded ?? 0) >= intent.amount_received;
    if (!paid || refunded || intent.metadata.product !== BENEFITS_CHECKLIST_PRODUCT || intent.metadata.download_token !== token) {
      return NextResponse.json({ error: "This download is not available." }, { status: 403 });
    }

    const file = benefitsDownloadsForOrder(intent.metadata.buyer_state || "", intent.metadata.state_pack === "1").find((item) => item.key === params.file);
    if (!file) return NextResponse.json({ error: "This file was not part of the order." }, { status: 403 });

    const { data, error } = await createServiceClient().storage.from(BENEFITS_CHECKLIST_STORAGE_BUCKET).download(file.source);
    if (error || !data) throw error || new Error("Private product file is missing");
    const buffer = await data.arrayBuffer();
    await captureServerEvent(
      "rgc_download_clicked",
      intent.metadata.analytics_id || intent.metadata.cid || `rs-order-${intent.id}`,
      {
        site: "retireshield.com",
        mc_site: "retireshield.com",
        product: BENEFITS_CHECKLIST_PRODUCT,
        package: params.file,
      },
      `download-${intent.id}-${params.file}`,
    );
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("benefits checklist download failed", error);
    return NextResponse.json({ error: "The download could not be opened. Please contact support." }, { status: 502 });
  }
}

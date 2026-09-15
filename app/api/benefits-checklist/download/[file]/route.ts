import { NextResponse } from "next/server";
import { BENEFITS_CHECKLIST_PRODUCT, BENEFITS_CHECKLIST_STORAGE_BUCKET, benefitsDownloadsForOrder } from "@/lib/benefitsChecklist";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { captureServerEvent } from "@/lib/posthogServer";
import { getBenefitsOrder } from "@/lib/benefitsOrders";
import { createStoredZip } from "@/lib/zip";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { file: string } }) {
  const url = new URL(req.url);
  const paymentIntentId = url.searchParams.get("payment_intent") || "";
  const orderId = url.searchParams.get("order") || "";
  const token = url.searchParams.get("token") || "";

  const genericOrderLink = /^[0-9a-f-]{36}$/.test(orderId);
  const legacyStripeLink = /^pi_[A-Za-z0-9]+$/.test(paymentIntentId);
  if (!/^[-a-z]+$/.test(params.file) || (!genericOrderLink && !legacyStripeLink) || !/^[a-f0-9]{48}$/.test(token)) {
    return NextResponse.json({ error: "Invalid download link." }, { status: 400 });
  }

  try {
    if (genericOrderLink) {
      const order = await getBenefitsOrder(orderId, token);
      if (!order || order.status !== "paid") return NextResponse.json({ error: "This download is not available." }, { status: 403 });
      const availableFiles = benefitsDownloadsForOrder(order.state, order.state_pack);
      if (params.file === "all") {
        const entries = [];
        for (const item of availableFiles) {
          const { data, error } = await createServiceClient().storage.from(BENEFITS_CHECKLIST_STORAGE_BUCKET).download(item.source);
          if (error || !data) throw error || new Error(`Private product file is missing: ${item.source}`);
          entries.push({ name: item.filename, data: new Uint8Array(await data.arrayBuffer()) });
        }
        const zip = createStoredZip(entries);
        return new NextResponse(zip, { headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": "attachment; filename=RetireShield-Benefits-Checklist-Downloads.zip",
          "Cache-Control": "private, no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow",
        } });
      }
      const file = availableFiles.find((item) => item.key === params.file);
      if (!file) return NextResponse.json({ error: "This file was not part of the order." }, { status: 403 });
      const { data, error } = await createServiceClient().storage.from(BENEFITS_CHECKLIST_STORAGE_BUCKET).download(file.source);
      if (error || !data) throw error || new Error("Private product file is missing");
      const buffer = await data.arrayBuffer();
      await captureServerEvent("rgc_download_clicked", order.attribution?.cid || `rs-order-${order.id}`, {
        site: "retireshield.com", mc_site: "retireshield.com", product: BENEFITS_CHECKLIST_PRODUCT, package: params.file,
      }, `download-${order.id}-${params.file}`);
      return new NextResponse(buffer, { headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      } });
    }

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

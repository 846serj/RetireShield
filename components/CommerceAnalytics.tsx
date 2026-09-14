"use client";

import { useEffect } from "react";
import { captureCommerce, type CommerceAttribution } from "@/lib/commerceAnalytics";

export function CommercePageAnalytics({
  product,
  attribution,
}: {
  product: string;
  attribution: CommerceAttribution;
}) {
  useEffect(() => {
    captureCommerce("rgc_sales_view", product, { page_variant: attribution.page_variant || "a" }, attribution);
    const handler = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-rgc-cta-position]") : null;
      if (target) captureCommerce("rgc_cta_clicked", product, { position: target.dataset.rgcCtaPosition || "unknown" }, attribution);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [attribution, product]);
  return null;
}

export function CommerceThanksAnalytics({
  product,
  status,
  attribution,
}: {
  product: string;
  status: string;
  attribution: CommerceAttribution;
}) {
  useEffect(() => {
    captureCommerce("rgc_thankyou_view", product, { status }, attribution);
    const handler = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-rgc-download]") : null;
      if (target) captureCommerce("rgc_download_clicked", product, { package: target.dataset.rgcDownload || "single" }, attribution);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [attribution, product, status]);
  return null;
}

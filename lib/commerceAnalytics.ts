"use client";

import posthog from "posthog-js";

export const COMMERCE_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "aid",
  "cid",
  "plat",
  "first_aid",
  "first_cid",
  "first_plat",
  "click_count",
  "page_variant",
  "source_site",
] as const;

export type CommerceAttribution = Partial<Record<(typeof COMMERCE_ATTRIBUTION_KEYS)[number], string>>;

function clean(value: unknown, max = 190) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

function readSaved() {
  if (typeof window === "undefined") return {} as CommerceAttribution;
  try {
    return JSON.parse(window.sessionStorage.getItem("rs_commerce_attribution") || "{}") as CommerceAttribution;
  } catch {
    return {} as CommerceAttribution;
  }
}

export function commerceAttribution(incoming: CommerceAttribution = {}) {
  const saved = readSaved();
  const merged: CommerceAttribution = { ...saved };
  for (const key of COMMERCE_ATTRIBUTION_KEYS) {
    const value = clean(incoming[key]);
    if (value) merged[key] = value;
  }
  merged.first_aid ||= merged.aid;
  merged.first_cid ||= merged.cid;
  merged.first_plat ||= merged.plat;
  merged.page_variant ||= "a";
  merged.source_site ||= merged.utm_source || "retireshield";
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("rs_commerce_attribution", JSON.stringify(merged));
    } catch {
      // Analytics storage must never affect checkout.
    }
  }
  return merged;
}

export function commerceAnalyticsId(attribution: CommerceAttribution = {}) {
  const merged = commerceAttribution(attribution);
  if (typeof window !== "undefined") {
    try {
      const saved = window.sessionStorage.getItem("rs_commerce_analytics_id");
      if (saved) return saved;
      const created = clean(posthog.__loaded ? posthog.get_distinct_id() : "", 200) || merged.cid || crypto.randomUUID();
      window.sessionStorage.setItem("rs_commerce_analytics_id", created);
      return created;
    } catch {
      return `rs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  return "";
}

export function captureCommerce(event: string, product: string, properties: Record<string, unknown> = {}, attribution: CommerceAttribution = {}) {
  const merged = commerceAttribution(attribution);
  const payload = {
    site: "retireshield.com",
    mc_site: "retireshield.com",
    product,
    analytics_id: commerceAnalyticsId(merged),
    ...merged,
    ...properties,
    $process_person_profile: false,
  };
  if (typeof window !== "undefined") {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, distinctId: payload.analytics_id, properties: payload }),
      cache: "no-store",
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // Analytics must never interrupt checkout.
    });
  }
}

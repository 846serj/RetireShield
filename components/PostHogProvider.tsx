"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      defaults: "2026-05-30",
      capture_pageview: false,
      autocapture: false,
      person_profiles: "identified_only",
      capture_pageleave: true,
      capture_dead_clicks: false,
      capture_exceptions: false,
      disable_surveys: true,
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        blockSelector: ".StripeElement,#payment-element,#express-checkout-element",
      },
      before_send: (event) => {
        if (!event?.properties) return event;
        for (const key of ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer"]) {
          const value = event.properties[key];
          if (typeof value !== "string") continue;
          try {
            const url = new URL(value, window.location.origin);
            event.properties[key] = url.origin + url.pathname;
          } catch {
            event.properties[key] = "";
          }
        }
        return event;
      },
      loaded: (client) => {
        const path = window.location.pathname;
        if (path.startsWith("/benefits-checklist") || path.startsWith("/personal-benefits-report")) {
          client.startSessionRecording();
        }
      },
    });
  }, []);

  useEffect(() => {
    posthog.capture("$pageview", { $current_url: window.location.origin + pathname, $process_person_profile: false });
    if (!posthog.__loaded) return;
    const commercePage = pathname.startsWith("/benefits-checklist") || pathname.startsWith("/personal-benefits-report");
    if (commercePage) posthog.startSessionRecording();
    else posthog.stopSessionRecording();
  }, [pathname]);

  return children;
}

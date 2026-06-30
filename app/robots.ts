import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/siteUrl";

const leadgenOnlyDisallow = [
  "/features",
  "/pricing",
  "/upgrade",
  "/resources",
  "/about",
  "/how-it-works",
  "/login",
  "/signup",
  "/coach",
  "/score",
  "/alerts",
  "/accounts",
  "/settings",
  "/tools",
  "/admin",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl();
  const isLeadgenOnly = process.env.NEXT_PUBLIC_LEADGEN_ONLY === "true";

  return {
    rules: [
      {
        userAgent: "*",
        allow: isLeadgenOnly
          ? ["/", "/quiz", "/privacy", "/terms", "/refund-policy"]
          : "/",
        disallow: isLeadgenOnly
          ? leadgenOnlyDisallow
          : ["/admin/", "/api/", "/coach/", "/tools/plan/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl,
  };
}

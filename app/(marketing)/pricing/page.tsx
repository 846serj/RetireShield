import { pageMetadata } from "@/lib/seo";
import PricingPageClient from "@/components/PricingPageClient";

export const metadata = pageMetadata({
  title: "RetireShield Pricing — Free Score and Paid Monitoring Plans",
  description: "Compare RetireShield Free, Plus, Premium, and Concierge plans for retirement Safety Scores, monitoring, alerts, and AI coach access.",
  path: "/pricing",
});

export default function PricingPage() {
  return <PricingPageClient />;
}

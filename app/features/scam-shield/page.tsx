import { FeaturePage } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Retirement Scam Protection | RetireShield",
  description: "Learn the red flags, verification habits, and response steps that help protect retirement savings from scams.",
  path: "/features/scam-shield",
});

export default function Page() {
  return <FeaturePage slug="scam-shield" />;
}

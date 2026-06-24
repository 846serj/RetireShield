import { FeaturePage } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Monthly Retirement Plan Monitoring | RetireShield",
  description: "Track monthly retirement risks, score changes, and plain-English alerts before small shifts become surprises.",
  path: "/features/monitoring",
});

export default function Page() {
  return <FeaturePage slug="monitoring" />;
}

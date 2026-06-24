import { FeaturePage } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Retirement Safety Score | RetireShield",
  description: "Get a free Retirement Safety Score in minutes and see the clearest next steps to strengthen your plan.",
  path: "/features/safety-score",
});

export default function Page() {
  return <FeaturePage slug="safety-score" />;
}

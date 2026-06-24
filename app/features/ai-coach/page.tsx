import { FeaturePage } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "AI Retirement Coach | RetireShield",
  description: "Ask retirement questions in plain English and get educational answers grounded in your own plan numbers.",
  path: "/features/ai-coach",
});

export default function Page() {
  return <FeaturePage slug="ai-coach" />;
}

import { FeaturesOverview } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Features | RetireShield",
  description: "Explore the RetireShield features that help you score, monitor, coach, and protect your retirement plan.",
  path: "/features",
});


export default function FeaturesPage() {
  return <FeaturesOverview />;
}

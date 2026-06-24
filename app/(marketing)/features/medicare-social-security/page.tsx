import { FeaturePage } from "@/components/features/FeaturePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Medicare & Social Security Planning | RetireShield",
  description: "Compare Social Security timing and Medicare cost risks so you can understand the tradeoffs in plain dollars.",
  path: "/features/medicare-social-security",
});

export default function Page() {
  return <FeaturePage slug="medicare-social-security" />;
}

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Upgrade RetireShield",
  description: "Start a RetireShield trial to unlock score history, matched alerts, planning tools, and plain-English coaching.",
  path: "/upgrade",
});

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

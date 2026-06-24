import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade RetireShield",
  description: "Start a RetireShield trial to unlock score history, matched alerts, planning tools, and education-only coaching.",
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

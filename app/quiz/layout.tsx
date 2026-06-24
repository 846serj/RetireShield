import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retirement Safety Score Quiz",
  description: "Answer a two-minute retirement readiness quiz and unlock your personalized Safety Score and next steps.",
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}

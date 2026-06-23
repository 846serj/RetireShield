"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Sends returning quiz-takers directly toward their dashboard instead of restarting the quiz flow.
export default function HomeRedirector() {
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem("rg_score")) router.replace("/dashboard");
    } catch {
      /* ignore unavailable localStorage */
    }
  }, [router]);

  return null;
}

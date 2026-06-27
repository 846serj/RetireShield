import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionAccess, SubscriptionTier } from "@/lib/subscription-types";

function tierFromPlan(plan?: string | null): SubscriptionTier {
  const normalized = plan?.toLowerCase() ?? "";
  if (normalized.startsWith("concierge")) return "concierge";
  if (normalized.startsWith("premium") || ["annual"].includes(normalized)) return "premium";
  if (normalized.startsWith("plus") || ["monthly"].includes(normalized)) return "plus";
  return "free";
}

export const getSubscriptionAccess = cache(async (userId: string): Promise<SubscriptionAccess> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("user_id", userId)
    .single();
  const active = !!data && ["trialing", "active"].includes(data.status);
  return {
    active,
    tier: active ? tierFromPlan(data.plan) : "free",
    plan: data?.plan ?? null,
    status: data?.status ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
  };
});

// True when the user may access paid features (in trial or actively paying).
export async function hasPaidAccess(userId: string): Promise<boolean> {
  return (await getSubscriptionAccess(userId)).active;
}

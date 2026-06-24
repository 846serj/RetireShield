import { createClient } from "@/lib/supabase/server";

export type SubscriptionTier = "free" | "plus" | "premium" | "concierge";

export type SubscriptionAccess = {
  active: boolean;
  tier: SubscriptionTier;
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

function tierFromPlan(plan?: string | null): SubscriptionTier {
  const normalized = plan?.toLowerCase() ?? "";
  if (["concierge"].includes(normalized)) return "concierge";
  if (["premium", "annual"].includes(normalized)) return "premium";
  if (["plus", "monthly"].includes(normalized)) return "plus";
  return "free";
}

export async function getSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
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
}

// True when the user may access paid features (in trial or actively paying).
export async function hasPaidAccess(userId: string): Promise<boolean> {
  return (await getSubscriptionAccess(userId)).active;
}

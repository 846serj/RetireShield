export type SubscriptionTier = "free" | "plus" | "premium" | "concierge";

export const COACH_MESSAGE_CAPS = {
  plus: 25,
  premium: null,
  concierge: null,
} as const;

export type SubscriptionAccess = {
  active: boolean;
  tier: SubscriptionTier;
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

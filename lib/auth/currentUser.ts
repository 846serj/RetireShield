import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionAccess } from "@/lib/subscription";

export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  return supabase.auth.getUser();
});

export const getCurrentSession = cache(async () => {
  const supabase = createClient();
  return supabase.auth.getSession();
});

export const getLatestScoreForUser = cache(async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
});

export const getProfileForUser = cache(async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
});

export const getRequestContext = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await getCurrentUser();
  if (!user) return { supabase, user: null, access: null, latestScore: null, profile: null };

  const [access, latestScore, profile] = await Promise.all([
    getSubscriptionAccess(user.id),
    getLatestScoreForUser(user.id),
    getProfileForUser(user.id),
  ]);

  return { supabase, user, access, latestScore, profile };
});

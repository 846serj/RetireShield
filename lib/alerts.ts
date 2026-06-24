// Profile-matched alerts feed. Matches content_items to the user's state, age, and top worry.

export type Alert = {
  id: string; title: string; body: string; category: string;
  states: string[] | null; min_age: number | null; created_at: string; what_to_ask?: string | null;
};

const WORRY_CATEGORY: Record<string, string> = {
  running_out: "benefit", inflation: "inflation", market: "inflation", scams: "scam", healthcare: "benefit",
};

type SupabaseLike = { from: (t: string) => any };

export async function getMatchedAlerts(
  supabase: SupabaseLike,
  profile: { state?: string; age: number; worry: string },
  limit = 12
): Promise<Alert[]> {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .lte("min_age", profile.age)
    .order("created_at", { ascending: false })
    .limit(60);

  const items: Alert[] = (data ?? []).filter(
    (it: Alert) => !it.states || it.states.length === 0 || (profile.state ? it.states.includes(profile.state) : false)
  );

  const topCat = WORRY_CATEGORY[profile.worry] ?? "";
  items.sort((a, b) => (b.category === topCat ? 1 : 0) - (a.category === topCat ? 1 : 0));
  return items.slice(0, limit);
}

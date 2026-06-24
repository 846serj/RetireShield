import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userEmail={userEmail} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

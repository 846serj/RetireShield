import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(getPublicBaseUrl(request.url));
}

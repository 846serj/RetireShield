import { NextResponse } from "next/server";
import { addBeehiivSubscriber } from "@/lib/beehiiv";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (!isValidEmail(body?.email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const firstName =
    typeof body?.firstName === "string" ? body.firstName.trim() : "";

  await addBeehiivSubscriber(body.email.trim().toLowerCase(), {
    utmSource: body?.utmSource ?? "direct_signup",
    tier: "free",
    firstName,
  });

  return NextResponse.json({ ok: true });
}

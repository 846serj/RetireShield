import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_PROFILE_DEFAULTS } from "@/lib/engine/types";

const PROFILE_FIELDS = [
  "birthdate",
  "marital_status",
  "spouse_birthdate",
  "state",
  "balance_taxable",
  "taxable_cost_basis",
  "balance_tax_deferred",
  "balance_roth",
  "stock_pct",
  "bond_pct",
  "cash_pct",
  "ss_benefit_fra",
  "ss_claim_age",
  "spouse_ss_benefit_fra",
  "spouse_ss_claim_age",
  "pension_amount",
  "pension_start_age",
  "pension_has_cola",
  "pension_survivor_pct",
  "spending_essential_monthly",
  "spending_discretionary_monthly",
  "inflation_assumption",
  "target_retirement_age",
  "planning_horizon_age",
] as const;

const NUMERIC_FIELDS = new Set<string>([
  "balance_taxable",
  "taxable_cost_basis",
  "balance_tax_deferred",
  "balance_roth",
  "stock_pct",
  "bond_pct",
  "cash_pct",
  "ss_benefit_fra",
  "ss_claim_age",
  "spouse_ss_benefit_fra",
  "spouse_ss_claim_age",
  "pension_amount",
  "pension_start_age",
  "pension_survivor_pct",
  "spending_essential_monthly",
  "spending_discretionary_monthly",
  "inflation_assumption",
  "target_retirement_age",
  "planning_horizon_age",
]);

function normalizeProfile(input: Record<string, unknown>, userId: string, includeMissingAsNull = false) {
  const row: Record<string, unknown> = {
    user_id: userId,
    inflation_assumption: FINANCIAL_PROFILE_DEFAULTS.inflation_assumption,
    planning_horizon_age: FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age,
  };

  for (const field of PROFILE_FIELDS) {
    const hasValue = field in input;
    if (!hasValue && !includeMissingAsNull) continue;
    const value = hasValue ? input[field] : null;
    if (value === "" || value === undefined || value === null) {
      row[field] = field === "inflation_assumption"
        ? FINANCIAL_PROFILE_DEFAULTS.inflation_assumption
        : field === "planning_horizon_age"
          ? FINANCIAL_PROFILE_DEFAULTS.planning_horizon_age
          : null;
    } else if (NUMERIC_FIELDS.has(field)) {
      const numeric = Number(value);
      row[field] = Number.isFinite(numeric) ? numeric : null;
    } else if (field === "pension_has_cola") {
      row[field] = Boolean(value);
    } else if (typeof value === "string") {
      row[field] = field === "state" ? value.toUpperCase() : value;
    } else {
      row[field] = value;
    }
  }

  return row;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid profile" }, { status: 400 });
  }

  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });

  const row = normalizeProfile(body as Record<string, unknown>, user.id, !existingProfile);
  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

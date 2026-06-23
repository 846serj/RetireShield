import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPaidAccess } from "@/lib/subscription";
import { getAnthropicClient, anthropicModel, timeoutSignal } from "@/lib/ai/client";
import { coachGuardrailResponse, SAFETY_SYSTEM } from "@/lib/ai/guardrails";
import { runProjection } from "@/lib/engine/projection";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { compareSocialSecurity } from "@/lib/engine/socialSecurity";
import { analyzeRothConversion } from "@/lib/engine/roth";
import { solveSafeSpending } from "@/lib/engine/withdrawal";
import type { FinancialProfile } from "@/lib/engine/types";

const MAX_PER_HOUR = 20;
const MAX_TOOL_LOOPS = 6;
const fallback = "The AI coach is unavailable right now. RetireGuard is education only and never asks for account numbers, SSNs, passwords, or payments. For personal decisions, talk with a licensed fiduciary.";

type IncomingMessage = { role: "user" | "assistant"; content: string };
type ToolName = "getProfile" | "updateProfile" | "runProjection" | "runMonteCarlo" | "compareSocialSecurity" | "solveSafeSpending" | "analyzeRothConversion";

const PROFILE_FIELDS = ["birthdate", "marital_status", "spouse_birthdate", "state", "balance_taxable", "taxable_cost_basis", "balance_tax_deferred", "balance_roth", "stock_pct", "bond_pct", "cash_pct", "ss_benefit_fra", "ss_claim_age", "spouse_ss_benefit_fra", "spouse_ss_claim_age", "pension_amount", "pension_start_age", "pension_has_cola", "pension_survivor_pct", "spending_essential_monthly", "spending_discretionary_monthly", "inflation_assumption", "target_retirement_age", "planning_horizon_age"] as const;
const NUMERIC_FIELDS = new Set<string>(PROFILE_FIELDS.filter((field) => !["birthdate", "marital_status", "spouse_birthdate", "state", "pension_has_cola"].includes(field)));

function cleanMessages(input: unknown): IncomingMessage[] {
  if (!Array.isArray(input)) return [];
  return input.slice(-10).filter((m): m is IncomingMessage =>
    !!m && ["user", "assistant"].includes((m as any).role) && typeof (m as any).content === "string"
  ).map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
}

function normalizePatch(input: unknown) {
  const patch: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return patch;
  const source = input as Record<string, unknown>;
  for (const field of PROFILE_FIELDS) {
    if (!(field in source)) continue;
    const value = source[field];
    if (value === "" || value === undefined) patch[field] = null;
    else if (NUMERIC_FIELDS.has(field)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) patch[field] = numeric;
    } else if (field === "pension_has_cola") patch[field] = Boolean(value);
    else if (typeof value === "string") patch[field] = field === "state" ? value.toUpperCase() : value;
    else patch[field] = value;
  }
  return patch;
}

function profileWithOverrides(profile: FinancialProfile, input: any) {
  return { ...profile, ...normalizePatch(input?.overrides) } as FinancialProfile;
}

function compactProjection(result: ReturnType<typeof runProjection>) {
  return { depletionAge: result.depletionAge, firstYear: result.years[0], lastYear: result.years.at(-1), sampleYears: result.years.filter((_, i) => i % 5 === 0).slice(0, 8) };
}

const tools = [
  { name: "getProfile", description: "Get the user's saved retirement profile inputs. Call this before discussing saved-profile facts.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "updateProfile", description: "Update saved profile fields only after the user explicitly asks to save a change.", input_schema: { type: "object", properties: { updates: { type: "object", additionalProperties: true } }, required: ["updates"], additionalProperties: false } },
  { name: "runProjection", description: "Run the deterministic retirement projection. Use overrides for what-if scenarios without saving them.", input_schema: { type: "object", properties: { overrides: { type: "object", additionalProperties: true }, drawdownMode: { type: "string", enum: ["standard", "taxOptimized"] }, targetBracketRate: { type: "number" } }, additionalProperties: false } },
  { name: "runMonteCarlo", description: "Run seeded Monte Carlo simulations for probability of success and percentile paths.", input_schema: { type: "object", properties: { overrides: { type: "object", additionalProperties: true }, runs: { type: "number", minimum: 50, maximum: 1000 } }, additionalProperties: false } },
  { name: "compareSocialSecurity", description: "Compare Social Security claiming ages using the saved profile or what-if overrides.", input_schema: { type: "object", properties: { overrides: { type: "object", additionalProperties: true }, monteCarloRuns: { type: "number", minimum: 50, maximum: 500 } }, additionalProperties: false } },
  { name: "solveSafeSpending", description: "Solve an education-only safe spending amount for a target Monte Carlo success rate.", input_schema: { type: "object", properties: { overrides: { type: "object", additionalProperties: true }, targetSuccess: { type: "number", minimum: 0.01, maximum: 0.99 } }, additionalProperties: false } },
  { name: "analyzeRothConversion", description: "Analyze an education-only Roth conversion illustration.", input_schema: { type: "object", properties: { overrides: { type: "object", additionalProperties: true }, targetBracketRate: { type: "number", minimum: 0.1, maximum: 0.37 } }, additionalProperties: false } },
];

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await hasPaidAccess(user.id))) return NextResponse.json({ ok: false }, { status: 401 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("coach_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: "Rate limit reached" }, { status: 429 });
  await supabase.from("coach_usage").insert({ user_id: user.id });

  try {
    const body = await req.json();
    const incoming = cleanMessages(body.messages);
    if (incoming.length === 0) return NextResponse.json({ error: "messages required" }, { status: 400 });

    const guardrail = coachGuardrailResponse(incoming.at(-1)?.content ?? "");
    if (guardrail) return new Response(guardrail, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

    const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!profileRow) return new Response("Please complete your retirement profile before using the AI coach.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    let profile = profileRow as FinancialProfile;
    const client = await getAnthropicClient();
    if (!client) return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

    const system = `${SAFETY_SYSTEM}\n- You are an interface to RetireGuard's calculation engine. NEVER state a financial number, age, probability, tax amount, balance, benefit, or spending figure unless it came from a tool result in this conversation.\n- Use tools for all personalized numeric answers. If you need a what-if number, call a tool with overrides.\n- Explain tool results in plain language, label all results education-only, and suggest 1-3 what-ifs the user could ask you to run.\n- Do not reveal raw JSON unless the user asks for technical details.`;
    const messages: any[] = incoming.map((m) => ({ role: m.role, content: m.content }));
    let response: any;

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      response = await client.messages.create({ model: anthropicModel, max_tokens: 1000, temperature: 0.2, system, tools, messages }, { signal: timeoutSignal(25_000) });
      messages.push({ role: "assistant", content: response.content });
      const toolUses = (response.content ?? []).filter((block: any) => block.type === "tool_use");
      if (toolUses.length === 0) break;

      const toolResults = [];
      for (const toolUse of toolUses) {
        const input = toolUse.input ?? {};
        let result: unknown;
        try {
          switch (toolUse.name as ToolName) {
            case "getProfile": result = profile; break;
            case "updateProfile": {
              const updates = normalizePatch(input.updates);
              const { data, error } = await supabase.from("profiles").update(updates).eq("user_id", user.id).select("*").single();
              if (error) throw error;
              profile = data as FinancialProfile;
              result = { ok: true, profile };
              break;
            }
            case "runProjection": result = compactProjection(runProjection(profileWithOverrides(profile, input), { drawdownMode: input.drawdownMode, targetBracketRate: input.targetBracketRate })); break;
            case "runMonteCarlo": result = runMonteCarlo(profileWithOverrides(profile, input), Math.min(1000, Math.max(50, Math.floor(input.runs ?? 500))), { seed: `${user.id}-coach` }); break;
            case "compareSocialSecurity": result = compareSocialSecurity(profileWithOverrides(profile, input), { monteCarloRuns: Math.min(500, Math.max(50, Math.floor(input.monteCarloRuns ?? 300))) }); break;
            case "solveSafeSpending": result = solveSafeSpending(profileWithOverrides(profile, input), input.targetSuccess); break;
            case "analyzeRothConversion": result = analyzeRothConversion(profileWithOverrides(profile, input), { targetBracketRate: input.targetBracketRate }); break;
            default: throw new Error(`Unknown tool: ${toolUse.name}`);
          }
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
        } catch (error) {
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, is_error: true, content: error instanceof Error ? error.message : "Tool failed" });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    if ((response?.content ?? []).some((block: any) => block.type === "tool_use")) {
      response = await client.messages.create({ model: anthropicModel, max_tokens: 1000, temperature: 0.2, system, messages }, { signal: timeoutSignal(25_000) });
    }

    const text = (response?.content ?? []).filter((block: any) => block.type === "text").map((block: any) => block.text).join("\n").trim() || fallback;
    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error) {
    console.error("Coach failed", error);
    return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

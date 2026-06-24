import type { CuratedAlert } from "@/lib/ai/alerts";

export type NewsroomItem = {
  title: string;
  body: string;
  category?: string;
  states?: string[] | null;
  source_url?: string | null;
  published_at?: string | null;
};

type GeneratedAlert = Omit<CuratedAlert, "status"> & { status: "draft" | "approved" | "published" };

const DATED_TRIGGERS: GeneratedAlert[] = [
  { title: "Medicare Open Enrollment starts October 15", body: "Medicare plans can change premiums, drug formularies, pharmacies, and out-of-pocket costs each year. Review your Annual Notice of Change before the December 7 deadline.", category: "medicare", states: [], min_age: 63, action_line: "Ask: Should I compare my current Medicare coverage against next year's drug and provider needs?", source_url: "https://www.medicare.gov/basics/get-started-with-medicare/get-more-coverage/your-coverage-options/compare-original-medicare-medicare-advantage", published_at: "2026-10-15T09:00:00Z", expires_at: "2026-12-08T05:00:00Z", status: "approved" },
  { title: "Medicare Open Enrollment final week", body: "Open Enrollment ends December 7. If prescriptions, doctors, premiums, or travel needs changed, this is the last scheduled window to switch plans for January 1 coverage.", category: "medicare", states: [], min_age: 63, action_line: "Ask: Have I checked my prescriptions and preferred pharmacies against next year's plan details?", source_url: "https://www.medicare.gov/plan-compare/", published_at: "2026-12-01T09:00:00Z", expires_at: "2026-12-08T05:00:00Z", status: "approved" },
  { title: "October Social Security COLA watch", body: "Social Security's annual COLA is typically announced in October after inflation data is released. Use the new benefit estimate to update your monthly retirement income plan.", category: "ss", states: [], min_age: 60, action_line: "Ask: What will my estimated net Social Security deposit be after Medicare premiums?", source_url: "https://www.ssa.gov/cola/", published_at: "2026-10-01T09:00:00Z", expires_at: "2026-11-15T05:00:00Z", status: "approved" },
  { title: "RMD deadline reminder", body: "Required minimum distributions generally must be taken by December 31 each year once RMD rules apply. Missing an RMD can trigger penalties, so verify custodians and amounts early.", category: "tax", states: [], min_age: 72, action_line: "Ask: Have I confirmed each IRA or workplace-plan RMD amount and withholding choice?", source_url: "https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs", published_at: "2026-11-15T09:00:00Z", expires_at: "2027-01-01T05:00:00Z", status: "approved" },
  { title: "Tax-year change checklist", body: "New tax brackets, deductions, Medicare premiums, and retirement contribution limits can shift planning math each January. Re-check withholding and cash-flow assumptions before the year gets busy.", category: "tax", states: [], min_age: null, action_line: "Ask: Do my withholding, estimated tax, or withdrawal settings need a January refresh?", source_url: "https://www.irs.gov/newsroom", published_at: "2027-01-02T09:00:00Z", expires_at: "2027-03-31T04:00:00Z", status: "approved" },
];

function classify(category?: string): GeneratedAlert["category"] {
  const c = (category ?? "").toLowerCase();
  if (c.includes("medicare")) return "medicare";
  if (c.includes("social") || c === "ss") return "ss";
  if (c.includes("tax") || c.includes("rmd") || c.includes("irmaa")) return "tax";
  if (c.includes("scam") || c.includes("fraud")) return "scam";
  if (c.includes("inflation") || c.includes("cost")) return "inflation";
  return "benefit";
}

export function datedTriggerAlerts() {
  return DATED_TRIGGERS.map((trigger) => ({ ...trigger }));
}

export function generateDraftAlertsFromNewsroom(items: NewsroomItem[]): GeneratedAlert[] {
  return items.slice(0, 20).map((item) => {
    const category = classify(item.category ?? `${item.title} ${item.body}`);
    return {
      title: item.title,
      body: item.body.length > 420 ? `${item.body.slice(0, 417).trim()}...` : item.body,
      category,
      states: item.states ?? [],
      min_age: category === "medicare" ? 63 : category === "ss" ? 60 : null,
      action_line: category === "scam" ? "What to do: Pause, verify through an official source, and do not share personal or financial information." : "Ask: Does this update change a deadline, income assumption, tax choice, or benefit review I should make?",
      source_url: item.source_url ?? null,
      published_at: item.published_at ?? null,
      expires_at: null,
      status: "draft",
    };
  });
}

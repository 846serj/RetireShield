import {
  BENEFITS_CHECKLIST_PRICE,
  BENEFITS_CHECKLIST_PRODUCT,
  BENEFITS_CHECKLIST_TAX_CODE,
  BENEFITS_STATE_PACK_PRICE,
} from "@/lib/benefitsChecklist";
import { stripe } from "@/lib/stripe";

export type BenefitsQuote = {
  subtotal: number;
  tax: number;
  total: number;
  taxCalculationId: string;
};

export async function calculateBenefitsQuote(zip: string, state: string, wantsStatePack: boolean): Promise<BenefitsQuote> {
  const subtotal = BENEFITS_CHECKLIST_PRICE + (wantsStatePack ? BENEFITS_STATE_PACK_PRICE : 0);
  if (process.env.BENEFITS_CHECKLIST_STRIPE_TAX_ENABLED === "false") {
    return { subtotal, tax: 0, total: subtotal, taxCalculationId: "" };
  }

  const calculation = await stripe.tax.calculations.create({
    currency: "usd",
    customer_details: {
      address: { country: "US", postal_code: zip, state },
      address_source: "billing",
    },
    line_items: [
      {
        amount: BENEFITS_CHECKLIST_PRICE,
        reference: BENEFITS_CHECKLIST_PRODUCT,
        tax_behavior: "exclusive",
        tax_code: BENEFITS_CHECKLIST_TAX_CODE,
      },
      ...(wantsStatePack ? [{
        amount: BENEFITS_STATE_PACK_PRICE,
        reference: `benefits-state-pack-${state.toLowerCase()}`,
        tax_behavior: "exclusive" as const,
        tax_code: BENEFITS_CHECKLIST_TAX_CODE,
      }] : []),
    ],
  });

  return {
    subtotal,
    tax: calculation.tax_amount_exclusive,
    total: calculation.amount_total,
    taxCalculationId: calculation.id || "",
  };
}

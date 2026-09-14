import crypto from "node:crypto";

export const BENEFITS_REPORT_PRODUCT = "benefits-report";
export const BENEFITS_REPORT_NAME = "The Personal Benefits Report";
export const BENEFITS_REPORT_PRICE = 29_700;
export const BENEFITS_REPORT_TAX_CODE = "txcd_10302000";

export function reportCredit(hasStatePack: boolean) {
  return hasStatePack ? 7_400 : 4_700;
}

export function reportPrice(credit: number) {
  return Math.max(0, BENEFITS_REPORT_PRICE - credit);
}

export function createReportToken() {
  return crypto.randomBytes(24).toString("hex");
}

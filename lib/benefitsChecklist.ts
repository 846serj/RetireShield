import crypto from "node:crypto";
import { US_STATES } from "@/lib/usStates";

export const BENEFITS_CHECKLIST_PRODUCT = "benefits-checklist";
export const BENEFITS_CHECKLIST_NAME = "The Benefits Checklist 2026–2027";
export const BENEFITS_CHECKLIST_PRICE = 4_700;
export const BENEFITS_CHECKLIST_LIST_PRICE = 9_700;
export const BENEFITS_STATE_PACK_PRICE = 2_700;
export const BENEFITS_CHECKLIST_TAX_CODE = "txcd_10302000";
export const BENEFITS_CHECKLIST_STORAGE_BUCKET = process.env.BENEFITS_CHECKLIST_STORAGE_BUCKET || "retire-shield-products";
const STATE_CODES = new Set(US_STATES.map((state) => state.code));

export const BENEFITS_CHECKLIST_DOWNLOADS = {
  guide: {
    label: "The Benefits Checklist 2026–2027",
    filename: "The-Benefits-Checklist-2026-2027.pdf",
    source: "benefits-checklist/The-Benefits-Checklist-2026-2027.pdf",
  },
  tracker: {
    label: "Printable application tracker",
    filename: "Benefits-Checklist-Printable-Tracker.pdf",
    source: "benefits-checklist/Benefits-Checklist-Printable-Tracker.pdf",
  },
  settlements: {
    label: "Open settlements insert",
    filename: "Benefits-Checklist-Open-Settlements.pdf",
    source: "benefits-checklist/Benefits-Checklist-Open-Settlements.pdf",
  },
} as const;

export type BenefitsChecklistDownloadKey = keyof typeof BENEFITS_CHECKLIST_DOWNLOADS;

export type BenefitsDownload = {
  key: string;
  label: string;
  filename: string;
  source: string;
};

export function benefitsDownloadsForOrder(state: string, hasStatePack: boolean): BenefitsDownload[] {
  const files: BenefitsDownload[] = Object.entries(BENEFITS_CHECKLIST_DOWNLOADS).map(([key, file]) => ({ key, ...file }));
  if (hasStatePack && normalizeState(state)) {
    files.push({
      key: "state-pack",
      label: `${US_STATES.find((item) => item.code === state)?.name || state} State Pack`,
      filename: `Benefits-Checklist-State-Pack-${state}.pdf`,
      source: `benefits-checklist/state-packs/Benefits-Checklist-State-Pack-${state}.pdf`,
    });
  }
  return files;
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function createDownloadToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function sanitizeShortText(value: unknown, max = 160) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

export function normalizeEmail(value: unknown) {
  const email = sanitizeShortText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
}

export function normalizeZip(value: unknown) {
  const match = sanitizeShortText(value, 10).match(/^(\d{5})(?:-\d{4})?$/);
  return match?.[1] ?? "";
}

export function normalizeState(value: unknown) {
  const state = sanitizeShortText(value, 2).toUpperCase();
  return STATE_CODES.has(state) ? state : "";
}

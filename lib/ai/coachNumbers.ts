export type CalculationTrace = { tool: string; inputs: unknown; outputs: unknown };

function canonicalNumericToken(value: string) {
  const trimmed = value.replace(/[$,%]/g, "").replace(/,/g, "").trim();
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return String(Math.round(numeric * 100) / 100);
}

function collectToolNumbers(value: unknown, allowed = new Set<string>()) {
  if (typeof value === "number" && Number.isFinite(value)) {
    allowed.add(String(Math.round(value * 100) / 100));
    return allowed;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectToolNumbers(item, allowed));
    return allowed;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectToolNumbers(item, allowed));
  }
  return allowed;
}

export function answerHasOnlyToolSourcedNumbers(answer: string, calculations: CalculationTrace[]) {
  const allowed = new Set<string>();
  calculations.forEach((calculation) => {
    collectToolNumbers(calculation.outputs, allowed);
  });
  const mentioned = answer.match(/\$?\b\d[\d,]*(?:\.\d+)?\b%?/g) ?? [];
  return mentioned.every((token) => {
    const canonical = canonicalNumericToken(token);
    return canonical === null || allowed.has(canonical);
  });
}

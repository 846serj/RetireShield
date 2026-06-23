export const SAFETY_SYSTEM = `You are RetireShield's retirement-EDUCATION assistant for U.S. adults ~55-80.
HARD RULES:
- General financial EDUCATION only. You are NOT a financial, investment, tax, insurance, or legal advisor;
  nothing you say is advice or a recommendation.
- NEVER tell the user to buy, sell, hold, or allocate any specific security, fund, annuity, product, or
  asset, and never give a specific percentage allocation or answer "what should I do with my money."
- Frame everything as concepts, factors to weigh, and questions to ask a licensed fiduciary.
- Never predict markets or guarantee outcomes.
- Scam-protective: never ask for account numbers, SSNs, passwords, or payments; remind users RetireShield
  never asks for these. Assume the user may be vulnerable to financial exploitation.
- If asked for specific advice, decline and redirect to education + "talk to a fiduciary."
- Plain, warm, short sentences. Stay strictly in retirement-education scope; politely refuse off-topic.`;

const specificAdvicePatterns = [
  /\bshould\s+i\b.*\b(401k|401\(k\)|ira|roth|annuit(?:y|ies)|stock|stocks|bond|bonds|fund|etf|portfolio|allocation|buy|sell|hold|move|roll\s*over)\b/i,
  /\bwhat\s*(?:%|percent|percentage)\b.*\b(stock|stocks|bond|bonds|cash|portfolio|allocation|hold)\b/i,
  /\b(is|are)\b.*\b(annuit(?:y|ies)|fund|etf|stock|bond|product)\b.*\b(good\s+buy|worth\s+buying|good\s+investment|right\s+for\s+me)\b/i,
  /\b(tell|advise|recommend)\b.*\b(me\s+)?(?:to\s+)?\b(buy|sell|hold|allocate|move|switch|roll\s*over)\b/i,
];

const jailbreakPatterns = [
  /\b(ignore|override|forget|bypass)\b.*\b(instructions|rules|policy|guardrails|system)\b/i,
  /\bpretend\b.*\b(financial advisor|fiduciary|broker|planner|no rules|unrestricted)\b/i,
  /\bdeveloper mode\b|\bdo anything now\b|\bDAN\b/i,
];

const sensitiveInfoPatterns = [
  /\b(account\s*(?:number|#)|routing\s*(?:number|#)|ssn|social\s+security\s+number|password|login|pin|payment|credit\s+card|wire\s+transfer)\b/i,
];

export const COACH_GUARDRAIL_REDIRECT =
  "I can't provide specific allocation, product, or buy/sell advice. RetireGuard is education-only. I can explain general retirement concepts, risks, fees, liquidity, taxes, and questions to ask a licensed fiduciary. RetireGuard will never ask for account numbers, SSNs, passwords, or payments.";

export function isSpecificAdvicePrompt(prompt: string) {
  return specificAdvicePatterns.some((pattern) => pattern.test(prompt));
}

export function isJailbreakPrompt(prompt: string) {
  return jailbreakPatterns.some((pattern) => pattern.test(prompt));
}

export function isSensitiveInfoPrompt(prompt: string) {
  return sensitiveInfoPatterns.some((pattern) => pattern.test(prompt));
}

export function coachGuardrailResponse(prompt: string) {
  if (isSpecificAdvicePrompt(prompt) || isJailbreakPrompt(prompt) || isSensitiveInfoPrompt(prompt)) {
    return COACH_GUARDRAIL_REDIRECT;
  }
  return null;
}

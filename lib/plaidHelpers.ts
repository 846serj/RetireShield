import { NextResponse } from "next/server";

const LOGIN_REQUIRED_CODES = new Set(["ITEM_LOGIN_REQUIRED", "PENDING_EXPIRATION"]);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

type PlaidLogContext = Record<string, string | number | boolean | null | undefined>;

function plaidErrorDetails(error: unknown) {
  const maybeError = error as {
    response?: { data?: { error_code?: string; error_message?: string; error_type?: string; request_id?: string } };
    message?: string;
  };
  return {
    error_code: maybeError.response?.data?.error_code,
    error_type: maybeError.response?.data?.error_type,
    error_message: maybeError.response?.data?.error_message ?? maybeError.message,
    request_id: maybeError.response?.data?.request_id,
  };
}

export function getPlaidErrorCode(error: unknown): string | undefined {
  return plaidErrorDetails(error).error_code;
}

export function isPlaidLoginRequired(error: unknown): boolean {
  const code = getPlaidErrorCode(error);
  return !!code && LOGIN_REQUIRED_CODES.has(code);
}

export function logPlaidInfo(event: string, context: PlaidLogContext = {}) {
  console.info(JSON.stringify({ event, provider: "plaid", ...context }));
}

export function logPlaidError(event: string, error: unknown, context: PlaidLogContext = {}) {
  console.error(JSON.stringify({ event, provider: "plaid", ...context, ...plaidErrorDetails(error) }));
}

export async function withPlaidLogging<T>(operation: string, context: PlaidLogContext, call: () => Promise<T>): Promise<T> {
  try {
    const result = await call();
    logPlaidInfo(`${operation}.success`, context);
    return result;
  } catch (error) {
    logPlaidError(`${operation}.failure`, error, context);
    throw error;
  }
}

export function checkPlaidRateLimit(userId: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= RATE_LIMIT_MAX_REQUESTS) {
    return null;
  }

  return NextResponse.json({ error: "Too many Plaid requests. Please wait a minute and try again." }, { status: 429 });
}

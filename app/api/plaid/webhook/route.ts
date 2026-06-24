import crypto from "crypto";
import { NextResponse } from "next/server";
import { plaid } from "@/lib/plaid";
import { logPlaidError, withPlaidLogging } from "@/lib/plaidHelpers";
import { syncItem } from "@/lib/plaidSync";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TRANSACTION_CODES = new Set(["SYNC_UPDATES_AVAILABLE"]);
const INVESTMENT_TYPES = new Set(["INVESTMENTS_TRANSACTIONS", "HOLDINGS"]);
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

type PlaidWebhookJwtHeader = {
  alg?: string;
  kid?: string;
};

type PlaidWebhookJwtPayload = {
  iat?: number;
  request_body_sha256?: string;
};

type PlaidWebhookBody = {
  item_id?: string;
  webhook_type?: string;
  webhook_code?: string;
};

type PlaidWebhookVerificationKey = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

const verificationKeyCache = new Map<string, PlaidWebhookVerificationKey>();

function badRequest() {
  return NextResponse.json({ ok: false }, { status: 400 });
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function decodeJwtPart<T>(jwtPart: string): T {
  return JSON.parse(base64UrlDecode(jwtPart).toString("utf8")) as T;
}

function normalizeSha256Digest(value: string): Buffer | null {
  try {
    if (/^[0-9a-f]{64}$/i.test(value)) {
      return Buffer.from(value, "hex");
    }

    const base64UrlDigest = Buffer.from(value, "base64url");
    if (base64UrlDigest.length === 32) {
      return base64UrlDigest;
    }

    const base64Digest = Buffer.from(value, "base64");
    return base64Digest.length === 32 ? base64Digest : null;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function isFreshIssuedAt(iat: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - iat) <= MAX_WEBHOOK_AGE_SECONDS;
}

async function getWebhookVerificationKey(keyId: string): Promise<PlaidWebhookVerificationKey> {
  const cachedKey = verificationKeyCache.get(keyId);
  if (cachedKey) {
    return cachedKey;
  }

  const { data } = await withPlaidLogging("webhookVerificationKeyGet", { key_id: keyId }, () =>
    plaid.webhookVerificationKeyGet({ key_id: keyId })
  );
  const key = data.key as PlaidWebhookVerificationKey;
  verificationKeyCache.set(keyId, key);
  return key;
}

async function verifyWebhookSignature(jwt: string, key: PlaidWebhookVerificationKey): Promise<boolean> {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    base64UrlDecode(encodedSignature),
    Buffer.from(`${encodedHeader}.${encodedPayload}`)
  );
}

async function verifyPlaidWebhook(request: Request, rawBody: string): Promise<PlaidWebhookJwtPayload | null> {
  const jwt = request.headers.get("Plaid-Verification");
  if (!jwt) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  let header: PlaidWebhookJwtHeader;
  let payload: PlaidWebhookJwtPayload;
  try {
    header = decodeJwtPart<PlaidWebhookJwtHeader>(encodedHeader);
    payload = decodeJwtPart<PlaidWebhookJwtPayload>(encodedPayload);
  } catch {
    return null;
  }

  if (header.alg !== "ES256" || !header.kid) {
    return null;
  }

  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat) || !isFreshIssuedAt(payload.iat)) {
    return null;
  }

  if (typeof payload.request_body_sha256 !== "string") {
    return null;
  }

  const expectedDigest = normalizeSha256Digest(payload.request_body_sha256);
  const actualDigest = crypto.createHash("sha256").update(rawBody).digest();
  if (!expectedDigest || !constantTimeEqual(actualDigest, expectedDigest)) {
    return null;
  }

  const key = await getWebhookVerificationKey(header.kid);
  const signatureValid = await verifyWebhookSignature(jwt, key);
  return signatureValid ? payload : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verifiedWebhook = await verifyPlaidWebhook(request, rawBody).catch((error) => {
    logPlaidError("webhook.verification_failure", error);
    return null;
  });

  if (!verifiedWebhook) {
    return badRequest();
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody) as PlaidWebhookBody;
  } catch {
    return badRequest();
  }

  const itemId = body.item_id;
  const webhookType = body.webhook_type;
  const webhookCode = body.webhook_code;

  if (
    itemId &&
    ((webhookType === "TRANSACTIONS" && TRANSACTION_CODES.has(webhookCode ?? "")) ||
      INVESTMENT_TYPES.has(webhookType ?? ""))
  ) {
    const service = createServiceClient();
    const { data: item } = await service.from("plaid_items").select("*").eq("item_id", itemId).maybeSingle();
    if (item) {
      syncItem(item).catch((error) => logPlaidError("webhook.sync_failure", error, { item_id: itemId }));
    }
  }

  return NextResponse.json({ ok: true });
}

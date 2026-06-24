export type EmailSegment = "free" | "trialing" | "paid" | "free-only";

type BeehiivSubscription = {
  id?: string;
  data?: {
    id?: string;
  };
};

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";
const SEGMENT_FIELD_NAME = "segment";

function getBeehiivConfig() {
  const apiKey = process.env.ESP_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey) {
    return null;
  }

  if (!publicationId) {
    console.error("[ESP] BEEHIIV_PUBLICATION_ID is missing; skipping Beehiiv sync");
    return null;
  }

  return {
    apiKey,
    baseUrl: `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions`,
  };
}

async function beehiivRequest<T>(url: string, apiKey: string, init: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(`[ESP] Beehiiv request failed (${response.status} ${response.statusText})`, details);
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("[ESP] Beehiiv request error", error);
    return null;
  }
}

function getSubscriptionId(subscription: BeehiivSubscription | null): string | null {
  return subscription?.data?.id ?? subscription?.id ?? null;
}

async function updateContactSegment(email: string, segment: EmailSegment) {
  const config = getBeehiivConfig();
  if (!config) return;

  const encodedEmail = encodeURIComponent(email);
  const subscription = await beehiivRequest<BeehiivSubscription>(
    `${config.baseUrl}/by_email/${encodedEmail}`,
    config.apiKey,
    { method: "GET" },
  );
  const subscriptionId = getSubscriptionId(subscription);

  if (!subscriptionId) {
    console.error(`[ESP] Beehiiv subscription lookup returned no ID for ${email}`);
    return;
  }

  await beehiivRequest(`${config.baseUrl}/${subscriptionId}`, config.apiKey, {
    method: "PATCH",
    body: JSON.stringify({
      custom_fields: [{ name: SEGMENT_FIELD_NAME, value: segment }],
    }),
  });
}

export async function upsertContact(email: string, segment: EmailSegment) {
  const config = getBeehiivConfig();
  if (!config) {
    if (!process.env.ESP_API_KEY) {
      console.log(`[ESP stub] add ${email} as ${segment}`);
    }
    return;
  }

  await beehiivRequest(config.baseUrl, config.apiKey, {
    method: "POST",
    body: JSON.stringify({
      email,
      reactivate_existing: true,
      send_welcome_email: false,
      double_opt_override: "off",
      custom_fields: [{ name: SEGMENT_FIELD_NAME, value: segment }],
      utm_source: "retireshield",
    }),
  });

  await updateContactSegment(email, segment);
}

export async function sendToList(email: string, segment: EmailSegment) {
  return upsertContact(email, segment);
}

export async function enrollInWinback(email: string) {
  try {
    const apiKey = process.env.ESP_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    const automationId = process.env.BEEHIIV_WINBACK_AUTOMATION_ID;

    if (!apiKey || !automationId) {
      console.log(
        "[ESP] Missing ESP_API_KEY or BEEHIIV_WINBACK_AUTOMATION_ID; skipping Beehiiv win-back enrollment",
      );
      return;
    }

    if (!publicationId) {
      console.error("[ESP] BEEHIIV_PUBLICATION_ID is missing; skipping Beehiiv win-back enrollment");
      return;
    }

    await beehiivRequest(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/automations/${automationId}/journeys`,
      apiKey,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  } catch (error) {
    console.error("[ESP] Beehiiv win-back enrollment error", error);
  }
}

export async function sendConfirmationEmail(email: string) {
  return upsertContact(email, "trialing");
}

export type RetirementWatchScoreUpdate = {
  previousOverall?: number | null;
  nextOverall: number;
  band: string;
  alertCount?: number;
  topAlertTitle?: string | null;
};

export async function sendRetirementWatchEmail(email: string, update: RetirementWatchScoreUpdate) {
  const apiKey = process.env.ESP_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const automationId = process.env.BEEHIIV_RETIREMENT_WATCH_AUTOMATION_ID;
  const delta = typeof update.previousOverall === "number" ? update.nextOverall - update.previousOverall : null;

  if (!apiKey || !automationId) {
    console.log(
      `[ESP Retirement Watch stub] ${email}: score ${update.nextOverall} (${delta === null ? "new" : `${delta >= 0 ? "+" : ""}${delta}`}), ${update.band}, alerts ${update.alertCount ?? 0}${update.topAlertTitle ? `, top: ${update.topAlertTitle}` : ""}`,
    );
    return;
  }

  if (!publicationId) {
    console.error("[ESP] BEEHIIV_PUBLICATION_ID is missing; skipping Retirement Watch email");
    return;
  }

  await beehiivRequest(
    `${BEEHIIV_API_BASE}/publications/${publicationId}/automations/${automationId}/journeys`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        custom_fields: [
          { name: "retirement_watch_score", value: String(update.nextOverall) },
          { name: "retirement_watch_delta", value: delta === null ? "" : `${delta >= 0 ? "+" : ""}${delta}` },
          { name: "retirement_watch_band", value: update.band },
          { name: "retirement_watch_alert_count", value: String(update.alertCount ?? 0) },
          { name: "retirement_watch_top_alert", value: update.topAlertTitle ?? "" },
        ],
      }),
    },
  );
}

export type TrustedContactFraudNotice = {
  memberEmail?: string | null;
  flagCount: number;
  topReason: string;
  topAdvice: string;
};

export async function sendTrustedContactFraudEmail(email: string, notice: TrustedContactFraudNotice) {
  const apiKey = process.env.ESP_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const automationId = process.env.BEEHIIV_TRUSTED_CONTACT_FRAUD_AUTOMATION_ID;

  if (!apiKey || !automationId) {
    console.log(`[ESP Trusted Contact stub] ${email}: ${notice.flagCount} high-risk fraud flag(s) for ${notice.memberEmail ?? "member"}; top: ${notice.topReason}; advice: ${notice.topAdvice}`);
    return;
  }

  if (!publicationId) {
    console.error("[ESP] BEEHIIV_PUBLICATION_ID is missing; skipping trusted-contact fraud email");
    return;
  }

  await beehiivRequest(
    `${BEEHIIV_API_BASE}/publications/${publicationId}/automations/${automationId}/journeys`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        custom_fields: [
          { name: "trusted_contact_member_email", value: notice.memberEmail ?? "" },
          { name: "trusted_contact_flag_count", value: String(notice.flagCount) },
          { name: "trusted_contact_top_reason", value: notice.topReason },
          { name: "trusted_contact_top_advice", value: notice.topAdvice },
        ],
      }),
    },
  );
}

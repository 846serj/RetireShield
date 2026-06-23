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

export async function sendConfirmationEmail(email: string) {
  return upsertContact(email, "trialing");
}

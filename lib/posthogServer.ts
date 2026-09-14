const POSTHOG_CAPTURE_PATH = "/i/v0/e/";

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

export async function captureServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
  insertId?: string,
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
  const safeDistinctId = clean(distinctId);
  if (!apiKey || !safeDistinctId || !/^https:\/\//.test(host)) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(host + POSTHOG_CAPTURE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: clean(event, 120),
        distinct_id: safeDistinctId,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          ...(insertId ? { $insert_id: clean(insertId) } : {}),
          $process_person_profile: false,
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch (error) {
    console.error("PostHog server capture failed", event, error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function isLikelyBot(userAgent: string, method = "GET") {
  if (method === "HEAD") return true;
  return /bot|crawler|spider|preview|facebookexternalhit|slurp|wget|curl|python|uptime|monitor/i.test(userAgent);
}

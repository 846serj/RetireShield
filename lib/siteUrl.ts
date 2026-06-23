const DEFAULT_PUBLIC_BASE_URL = "https://RetireShield.com";

function normalizeBaseUrl(url: string | undefined) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function isLocalhost(url: string) {
  return new URL(url).hostname === "localhost";
}

/**
 * Returns the externally reachable app origin used in auth, Stripe, and redirect links.
 *
 * Hosted platforms can expose internal request origins such as https://localhost:10000.
 * Those origins are not reachable from customer emails, so production links must prefer
 * NEXT_PUBLIC_BASE_URL and ultimately fall back to the RetireShield public domain.
 */
export function getPublicBaseUrl(fallbackOrigin?: string) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  if (configuredBaseUrl && !isLocalhost(configuredBaseUrl)) return configuredBaseUrl;

  const normalizedFallback = normalizeBaseUrl(fallbackOrigin);
  if (normalizedFallback && !isLocalhost(normalizedFallback)) return normalizedFallback;

  if (process.env.NODE_ENV !== "production") {
    return normalizedFallback ?? configuredBaseUrl ?? DEFAULT_PUBLIC_BASE_URL;
  }

  return DEFAULT_PUBLIC_BASE_URL;
}

type BeehiivSubscriberOptions = {
  utmSource?: string;
  tier?: string;
  firstName?: string;
};

export async function addBeehiivSubscriber(
  email: string,
  opts?: BeehiivSubscriberOptions,
) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.log(
      `[Beehiiv stub] add ${email}${opts?.tier ? ` as ${opts.tier}` : ""}`,
    );
    return;
  }

  try {
    const customFields = [
      ...(opts?.tier ? [{ name: "tier", value: opts.tier }] : []),
      // The "First Name" custom field must already exist in Beehiiv or Beehiiv discards it.
      ...(opts?.firstName?.trim()
        ? [{ name: "First Name", value: opts.firstName.trim() }]
        : []),
    ];

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: opts?.utmSource ?? "retireshield",
          custom_fields: customFields.length ? customFields : undefined,
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(
        `[Beehiiv] subscriber push failed (${response.status} ${response.statusText})`,
        details,
      );
    }
  } catch (error) {
    console.error("[Beehiiv] subscriber push error", error);
  }
}

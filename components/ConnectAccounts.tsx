"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui";

type ConnectedInstitution = {
  item_id: string;
  institution_name: string | null;
  status: string | null;
  created_at: string | null;
};

type ConnectAccountsProps = {
  institutions: ConnectedInstitution[];
};

export default function ConnectAccounts({ institutions }: ConnectAccountsProps) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [linkModeItemId, setLinkModeItemId] = useState<string | null>(null);
  const [shouldOpenWhenReady, setShouldOpenWhenReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const createLinkToken = useCallback(async (itemId?: string) => {
    setMessage(null);
    setLinkModeItemId(itemId ?? null);
    const response = await fetch(itemId ? `/api/plaid/link-token?item_id=${encodeURIComponent(itemId)}` : "/api/plaid/link-token");
    if (!response.ok) throw new Error("Could not start Plaid Link");
    const data = await response.json();
    setLinkToken(data.link_token);
  }, []);

  useEffect(() => {
    createLinkToken().catch(() => setMessage("We could not start a secure connection right now. Please try again."));
  }, [createLinkToken]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      startTransition(async () => {
        if (linkModeItemId) {
          await fetch("/api/plaid/reconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: linkModeItemId }),
          });
          setMessage("Reconnected. We are refreshing your dashboard.");
          await createLinkToken();
          router.refresh();
          return;
        }

        setMessage("Finishing the secure read-only connection…");
        const response = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        if (!response.ok) {
          setMessage("We could not connect that institution. Please try again.");
          return;
        }
        setMessage("Connected. We are refreshing your dashboard.");
        router.refresh();
      });
    },
  });

  useEffect(() => {
    if (shouldOpenWhenReady && ready) {
      setShouldOpenWhenReady(false);
      open();
    }
  }, [open, ready, shouldOpenWhenReady]);

  async function reconnect(itemId: string) {
    try {
      setMessage("Opening a secure reconnection…");
      await createLinkToken(itemId);
      setShouldOpenWhenReady(true);
    } catch {
      setMessage("We could not start reconnection right now. Please try again.");
    }
  }

  async function disconnect(itemId: string) {
    startTransition(async () => {
      setMessage("Disconnecting this institution…");
      const response = await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      setMessage(response.ok ? "Institution disconnected." : "We could not disconnect that institution. Please try again.");
      router.refresh();
    });
  }

  return (
    <section className="rg-card mb-8" aria-labelledby="connect-accounts-heading">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="rg-kicker">Read-only account sync</p>
          <h2 id="connect-accounts-heading" className="mt-2 text-3xl font-extrabold">Securely connect your bank or brokerage.</h2>
          <p className="mt-3 text-xl font-semibold leading-8 text-slate-700">
            It&apos;s read-only — we can see your balances to build your plan, but we can never move your money.
          </p>
          {message ? <p className="mt-3 text-sm font-semibold text-brand">{message}</p> : null}
        </div>
        <Button type="button" onClick={() => open()} disabled={!ready || isPending}>
          {isPending ? "Working…" : "Connect account"}
        </Button>
      </div>

      {institutions.length > 0 ? (
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {institutions.map((institution) => {
            const needsReconnect = institution.status === "login_required";

            return (
              <div key={institution.item_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-ink">{institution.institution_name ?? "Connected institution"}</p>
                  <p className={needsReconnect ? "text-sm font-semibold text-amber-700" : "text-sm text-slate-600"}>
                    {needsReconnect ? "Reconnect your account to keep balances and activity up to date." : `Status: ${institution.status ?? "active"}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {needsReconnect ? (
                    <button
                      type="button"
                      onClick={() => reconnect(institution.item_id)}
                      disabled={isPending}
                      className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                    >
                      Reconnect account
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => disconnect(institution.item_id)}
                    disabled={isPending}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

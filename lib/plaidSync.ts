import { decrypt } from "@/lib/crypto";
import { plaid } from "@/lib/plaid";
import { createServiceClient } from "@/lib/supabase/server";

type PlaidItem = {
  user_id: string;
  item_id: string;
  access_token_encrypted: string;
  transactions_cursor?: string | null;
};

type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  date?: string | null;
  amount?: number | null;
  name?: string | null;
  merchant_name?: string | null;
  category?: string[] | null;
  personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
  pending?: boolean | null;
  payment_channel?: string | null;
};

function accountRow(userId: string, itemId: string, account: any) {
  return {
    user_id: userId,
    item_id: itemId,
    account_id: account.account_id,
    name: account.name ?? null,
    official_name: account.official_name ?? null,
    type: account.type ?? null,
    subtype: account.subtype ?? null,
    mask: account.mask ?? null,
    current_balance: account.balances?.current ?? null,
    available_balance: account.balances?.available ?? null,
    iso_currency_code: account.balances?.iso_currency_code ?? null,
    updated_at: new Date().toISOString(),
  };
}

function transactionRow(userId: string, transaction: PlaidTransaction) {
  return {
    user_id: userId,
    account_id: transaction.account_id,
    transaction_id: transaction.transaction_id,
    date: transaction.date ?? null,
    amount: transaction.amount ?? null,
    name: transaction.name ?? null,
    merchant_name: transaction.merchant_name ?? null,
    category: transaction.category?.join(" > ") ?? null,
    personal_finance_category: transaction.personal_finance_category?.detailed ?? transaction.personal_finance_category?.primary ?? null,
    pending: transaction.pending ?? false,
    payment_channel: transaction.payment_channel ?? null,
  };
}

export async function refreshBalances(item: PlaidItem, accessToken: string) {
  const service = createServiceClient();
  const { data } = await plaid.accountsBalanceGet({ access_token: accessToken });
  const accounts = data.accounts.map((account: any) => accountRow(item.user_id, item.item_id, account));
  if (accounts.length > 0) {
    await service.from("financial_accounts").upsert(accounts, { onConflict: "account_id" });
  }
}

export async function syncTransactions(item: PlaidItem, accessToken: string) {
  const service = createServiceClient();
  let cursor = item.transactions_cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const { data } = await plaid.transactionsSync({ access_token: accessToken, cursor });
    const upserts = [...data.added, ...data.modified].map((transaction: PlaidTransaction) => transactionRow(item.user_id, transaction));

    if (upserts.length > 0) {
      await service.from("transactions").upsert(upserts, { onConflict: "transaction_id" });
    }

    const removedIds = data.removed.map((transaction: { transaction_id: string }) => transaction.transaction_id);
    if (removedIds.length > 0) {
      await service.from("transactions").delete().eq("user_id", item.user_id).in("transaction_id", removedIds);
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await service.from("plaid_items").update({ transactions_cursor: cursor }).eq("user_id", item.user_id).eq("item_id", item.item_id);
  await refreshBalances(item, accessToken);
}

export async function syncHoldings(item: PlaidItem, accessToken: string) {
  const service = createServiceClient();
  const { data } = await plaid.investmentsHoldingsGet({ access_token: accessToken });

  const accounts = data.accounts.map((account: any) => accountRow(item.user_id, item.item_id, account));
  if (accounts.length > 0) await service.from("financial_accounts").upsert(accounts, { onConflict: "account_id" });

  const securities = data.securities.map((security: any) => ({
    security_id: security.security_id,
    ticker: security.ticker_symbol ?? null,
    name: security.name ?? null,
    type: security.type ?? null,
    close_price: security.close_price ?? null,
    is_cash_equivalent: security.is_cash_equivalent ?? false,
    expense_ratio: null,
  }));
  if (securities.length > 0) await service.from("securities").upsert(securities, { onConflict: "security_id" });

  const holdings = data.holdings.map((holding: any) => {
    const security = data.securities.find((candidate: any) => candidate.security_id === holding.security_id);
    return {
      user_id: item.user_id,
      account_id: holding.account_id,
      security_id: holding.security_id ?? null,
      ticker: security?.ticker_symbol ?? null,
      name: security?.name ?? null,
      type: security?.type ?? null,
      quantity: holding.quantity ?? null,
      institution_value: holding.institution_value ?? null,
      cost_basis: holding.cost_basis ?? null,
      iso_currency_code: holding.iso_currency_code ?? null,
      updated_at: new Date().toISOString(),
    };
  });
  if (holdings.length > 0) await service.from("holdings").upsert(holdings, { onConflict: "user_id,account_id,security_id" });
}

export async function syncItem(item: PlaidItem) {
  const accessToken = decrypt(item.access_token_encrypted);
  await syncTransactions(item, accessToken);
  await syncHoldings(item, accessToken);
  await refreshBalances(item, accessToken);
}

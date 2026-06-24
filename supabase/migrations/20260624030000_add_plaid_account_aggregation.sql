create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  item_id text unique not null,
  access_token_encrypted text not null,
  institution_name text,
  institution_id text,
  status text default 'active',
  transactions_cursor text,
  created_at timestamptz default now()
);

create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id text not null,
  account_id text unique not null,
  name text,
  official_name text,
  type text,
  subtype text,
  mask text,
  current_balance numeric,
  available_balance numeric,
  iso_currency_code text,
  updated_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id text not null,
  transaction_id text unique not null,
  date date,
  amount numeric,
  name text,
  merchant_name text,
  category text,
  personal_finance_category text,
  pending boolean,
  payment_channel text,
  created_at timestamptz default now()
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id text not null,
  security_id text,
  ticker text,
  name text,
  type text,
  quantity numeric,
  institution_value numeric,
  cost_basis numeric,
  iso_currency_code text,
  updated_at timestamptz default now(),
  unique (user_id, account_id, security_id)
);

create table if not exists securities (
  security_id text primary key,
  ticker text,
  name text,
  type text,
  close_price numeric,
  is_cash_equivalent boolean,
  expense_ratio numeric
);

alter table plaid_items enable row level security;
alter table financial_accounts enable row level security;
alter table transactions enable row level security;
alter table holdings enable row level security;
alter table securities enable row level security;

create policy "Users can view own plaid items" on plaid_items for select using (auth.uid() = user_id);
create policy "Users can view own financial accounts" on financial_accounts for select using (auth.uid() = user_id);
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can view own holdings" on holdings for select using (auth.uid() = user_id);
create policy "Authenticated users can view securities" on securities for select using (auth.uid() is not null);

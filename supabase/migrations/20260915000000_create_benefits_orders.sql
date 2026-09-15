-- Durable, provider-neutral orders for Benefits Checklist fulfillment.
create table if not exists benefits_orders (
  id uuid primary key default gen_random_uuid(),
  order_token text not null unique,
  product text not null default 'benefits-checklist',
  provider text not null check (provider in ('stripe', 'paypal')),
  provider_order_id text not null,
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  email text not null,
  first_name text not null default '',
  zip text not null,
  state text not null,
  state_pack boolean not null default false,
  newsletter_optin boolean not null default false,
  subtotal_cents integer not null,
  tax_cents integer not null default 0,
  tax_calculation_id text,
  tax_transaction_id text,
  total_cents integer not null,
  currency text not null default 'usd',
  attribution jsonb not null default '{}'::jsonb,
  purchase_email_status text not null default 'pending' check (purchase_email_status in ('pending', 'sending', 'sent', 'failed')),
  purchase_email_attempts integer not null default 0,
  purchase_email_sent_at timestamptz,
  purchase_email_last_error text,
  newsletter_status text not null default 'not_requested' check (newsletter_status in ('not_requested', 'pending', 'subscribing', 'subscribed', 'failed')),
  newsletter_attempts integer not null default 0,
  newsletter_completed_at timestamptz,
  newsletter_last_error text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id)
);

create index if not exists benefits_orders_status_idx on benefits_orders (status, created_at desc);
create index if not exists benefits_orders_email_idx on benefits_orders (email, created_at desc);
create index if not exists benefits_orders_fulfillment_idx on benefits_orders (purchase_email_status, newsletter_status, paid_at);

alter table benefits_orders enable row level security;
-- No browser policy is intentional. Only service-role server routes may read or write orders.

create table if not exists benefits_checkout_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null default '',
  zip text not null default '',
  state text not null default '',
  state_pack boolean not null default false,
  newsletter_optin boolean not null default false,
  attribution jsonb not null default '{}'::jsonb,
  recovery_status text not null default 'eligible' check (recovery_status in ('eligible', 'purchased', 'suppressed')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (email)
);

create index if not exists benefits_checkout_leads_recovery_idx on benefits_checkout_leads (recovery_status, last_seen_at desc);
alter table benefits_checkout_leads enable row level security;
-- No browser policy is intentional. The public endpoint validates and writes through the service role.

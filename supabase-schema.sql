-- Run this in Supabase → SQL editor to create the leads table (Phase 0/2).
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  answers jsonb,
  overall_score int,
  sub_scores jsonb,
  band text,
  source text default 'direct',
  campaign text default '',
  created_at timestamptz default now()
);
create index if not exists leads_email_idx on leads (email);
create index if not exists leads_created_idx on leads (created_at);

-- ============ Phase 3-5: accounts, scores, billing, content ============
-- Supabase Auth provides auth.users; we key everything to auth.uid().

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  overall int,
  sub_scores jsonb,
  band text,
  answers jsonb,
  score_source text default 'quiz',
  created_at timestamptz default now()
);
create index if not exists scores_user_created_idx on scores (user_id, created_at desc);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,                 -- trialing | active | past_due | canceled
  plan text,                   -- annual | monthly
  trial_end timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('benefit','inflation','scam','tax','medicare','ss','costofliving','healthcare')),
  states text[] null,
  min_age int null,
  action_line text not null,
  source_url text null,
  published_at timestamptz null,
  expires_at timestamptz null,
  status text not null default 'draft' check (status in ('draft','approved','published','archived')),
  created_at timestamptz default now()
);

-- Row Level Security: users see only their own rows.
alter table scores enable row level security;
alter table subscriptions enable row level security;
create policy "own scores" on scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sub" on subscriptions for select using (auth.uid() = user_id);
-- content_items is readable by all authed users:
alter table content_items enable row level security;
create policy "read content" on content_items for select using (true);

-- Lightweight engagement tracking for APP-3 /dashboard.
create table if not exists user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz
);
create index if not exists user_activity_last_seen_at_idx on user_activity (last_seen_at desc);
alter table user_activity enable row level security;
create policy "own user activity" on user_activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

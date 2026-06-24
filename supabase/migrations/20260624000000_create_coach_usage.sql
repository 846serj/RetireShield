create table if not exists coach_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text,
  plan text,
  prompt_chars integer,
  tool_calls integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists coach_usage_user_created_at_idx on coach_usage (user_id, created_at desc);

alter table coach_usage enable row level security;

drop policy if exists "own coach usage select" on coach_usage;
create policy "own coach usage select" on coach_usage
  for select using (auth.uid() = user_id);

drop policy if exists "own coach usage insert" on coach_usage;
create policy "own coach usage insert" on coach_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists "own coach usage update" on coach_usage;
create policy "own coach usage update" on coach_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

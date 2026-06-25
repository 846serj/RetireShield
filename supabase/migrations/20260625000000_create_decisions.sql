create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input jsonb not null,
  result jsonb not null,
  verdict text not null,
  tier text,
  created_at timestamptz not null default now()
);

create index if not exists decisions_user_created_idx on decisions (user_id, created_at desc);
alter table decisions enable row level security;
create policy "own decisions" on decisions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

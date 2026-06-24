create table if not exists user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz
);

insert into user_activity (user_id, last_seen_at)
select user_id, last_seen_at
from profiles
where last_seen_at is not null
on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;

create index if not exists user_activity_last_seen_at_idx on user_activity (last_seen_at desc);

alter table user_activity enable row level security;

drop policy if exists "own user activity select" on user_activity;
create policy "own user activity select" on user_activity
  for select using (auth.uid() = user_id);

drop policy if exists "own user activity insert" on user_activity;
create policy "own user activity insert" on user_activity
  for insert with check (auth.uid() = user_id);

drop policy if exists "own user activity update" on user_activity;
create policy "own user activity update" on user_activity
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop index if exists profiles_last_seen_at_idx;

alter table profiles
  drop column if exists last_seen_at;

alter table profiles
  alter column ss_benefit_fra drop default;

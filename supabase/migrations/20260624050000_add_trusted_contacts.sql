create table if not exists trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  email text not null,
  consent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, email)
);

alter table trusted_contacts enable row level security;

create policy "Users can view own trusted contacts" on trusted_contacts for select using (auth.uid() = user_id);
create policy "Users can insert own trusted contacts" on trusted_contacts for insert with check (auth.uid() = user_id);
create policy "Users can update own trusted contacts" on trusted_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trusted contacts" on trusted_contacts for delete using (auth.uid() = user_id);

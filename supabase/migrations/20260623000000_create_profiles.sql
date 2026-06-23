create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birthdate date,
  marital_status text,
  spouse_birthdate date,
  state text,
  balance_taxable numeric(14,2) default 0,
  taxable_cost_basis numeric(14,2),
  balance_tax_deferred numeric(14,2) default 0,
  balance_roth numeric(14,2) default 0,
  stock_pct numeric(5,2) default 0,
  bond_pct numeric(5,2) default 0,
  cash_pct numeric(5,2) default 0,
  ss_benefit_fra numeric(14,2) default 0,
  ss_claim_age numeric(5,2),
  spouse_ss_benefit_fra numeric(14,2),
  spouse_ss_claim_age numeric(5,2),
  pension_amount numeric(14,2),
  pension_start_age numeric(5,2),
  pension_has_cola boolean default false,
  pension_survivor_pct numeric(5,2),
  spending_essential_monthly numeric(14,2) default 0,
  spending_discretionary_monthly numeric(14,2) default 0,
  inflation_assumption numeric(6,5) default 0.03,
  target_retirement_age numeric(5,2),
  planning_horizon_age numeric(5,2) default 95,
  updated_at timestamptz default now(),
  constraint profiles_marital_status_check check (marital_status is null or marital_status in ('single', 'married', 'partnered', 'widowed', 'divorced')),
  constraint profiles_state_check check (state is null or length(state) = 2),
  constraint profiles_allocation_check check (
    coalesce(stock_pct, 0) >= 0 and coalesce(bond_pct, 0) >= 0 and coalesce(cash_pct, 0) >= 0
    and coalesce(stock_pct, 0) <= 100 and coalesce(bond_pct, 0) <= 100 and coalesce(cash_pct, 0) <= 100
  )
);

create index if not exists profiles_updated_at_idx on profiles (updated_at desc);

create or replace function set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
before update on profiles
for each row execute function set_profiles_updated_at();

alter table profiles enable row level security;

drop policy if exists "own profile select" on profiles;
create policy "own profile select" on profiles
  for select using (auth.uid() = user_id);

drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile delete" on profiles;
create policy "own profile delete" on profiles
  for delete using (auth.uid() = user_id);

create table if not exists benefits_report_intakes (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id text not null unique,
  email text not null,
  first_name text,
  state text,
  status text not null default 'partial' check (status in ('partial', 'complete', 'working', 'sent')),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists benefits_report_intakes_status_idx on benefits_report_intakes (status, updated_at desc);
alter table benefits_report_intakes enable row level security;

-- This table is private. The site writes it with the server-only service role.

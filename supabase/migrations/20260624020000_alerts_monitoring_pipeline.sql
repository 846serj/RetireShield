alter table content_items
  add column if not exists action_line text,
  add column if not exists source_url text,
  add column if not exists published_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists status text default 'draft';

alter table content_items alter column states drop default;
alter table content_items alter column min_age drop default;

update content_items set
  action_line = coalesce(action_line, what_to_ask, 'Ask: Does this update change anything I should review in my retirement plan?'),
  published_at = coalesce(published_at, created_at),
  status = coalesce(status, 'published')
where action_line is null or published_at is null or status is null;

alter table content_items alter column action_line set not null;
alter table content_items alter column status set not null;

do $$ begin
  alter table content_items add constraint content_items_category_check check (category in ('benefit','inflation','scam','tax','medicare','ss','costofliving','healthcare'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table content_items add constraint content_items_status_check check (status in ('draft','approved','published','archived'));
exception when duplicate_object then null; end $$;

create index if not exists content_items_live_idx on content_items (status, published_at desc, expires_at);
create index if not exists content_items_category_idx on content_items (category);

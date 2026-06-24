alter table scores add column if not exists score_source text default 'quiz';
create index if not exists scores_user_created_idx on scores (user_id, created_at desc);

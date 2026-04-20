create table if not exists public.result_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  recommendation_id uuid references public.action_recommendations(id) on delete set null,
  cause_key text,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text,
  due_date date,
  note text,
  evidence_url text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint result_actions_status_check check (status in ('todo', 'doing', 'done'))
);

create unique index if not exists idx_result_actions_result_recommendation_unique
  on public.result_actions(result_id, recommendation_id);

create index if not exists idx_result_actions_user_id
  on public.result_actions(user_id);

create index if not exists idx_result_actions_result_id
  on public.result_actions(result_id);

create index if not exists idx_result_actions_status
  on public.result_actions(status);

alter table public.result_actions enable row level security;

create policy "result_actions_select_own"
on public.result_actions
for select
using (auth.uid() = user_id);

create policy "result_actions_insert_own"
on public.result_actions
for insert
with check (auth.uid() = user_id);

create policy "result_actions_update_own"
on public.result_actions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "result_actions_delete_own"
on public.result_actions
for delete
using (auth.uid() = user_id);

create table if not exists public.result_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  diagnosis_result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  action_recommendation_id uuid references public.action_recommendations(id) on delete set null,
  title text not null,
  description text,
  priority text,
  status text not null default 'todo',
  due_date date,
  completed_at timestamptz,
  note text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint result_actions_status_check check (status in ('todo', 'doing', 'done')),
  constraint result_actions_result_recommendation_unique unique (diagnosis_result_id, action_recommendation_id)
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'result_actions'
      and column_name = 'diagnosis_result_id'
  ) then
    alter table public.result_actions
      add column diagnosis_result_id uuid references public.diagnosis_results(id) on delete cascade;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'result_actions'
        and column_name = 'result_id'
    ) then
      update public.result_actions
      set diagnosis_result_id = result_id
      where diagnosis_result_id is null;
    end if;

    alter table public.result_actions
      alter column diagnosis_result_id set not null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'result_actions'
      and column_name = 'action_recommendation_id'
  ) then
    alter table public.result_actions
      add column action_recommendation_id uuid references public.action_recommendations(id) on delete set null;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'result_actions'
        and column_name = 'recommendation_id'
    ) then
      update public.result_actions
      set action_recommendation_id = recommendation_id
      where action_recommendation_id is null;
    end if;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'result_actions'
      and column_name = 'updated_at'
  ) then
    alter table public.result_actions
      add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'result_actions_result_recommendation_unique'
      and conrelid = 'public.result_actions'::regclass
  ) then
    alter table public.result_actions
      add constraint result_actions_result_recommendation_unique
      unique (diagnosis_result_id, action_recommendation_id);
  end if;
end $$;

create index if not exists idx_result_actions_user_id
  on public.result_actions(user_id);

create index if not exists idx_result_actions_diagnosis_result_id
  on public.result_actions(diagnosis_result_id);

create index if not exists idx_result_actions_action_recommendation_id
  on public.result_actions(action_recommendation_id);

create index if not exists idx_result_actions_status
  on public.result_actions(status);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_result_actions_updated_at'
      and tgrelid = 'public.result_actions'::regclass
  ) then
    create trigger set_result_actions_updated_at
    before update on public.result_actions
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.result_actions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'result_actions'
      and policyname = 'result_actions_select_own'
  ) then
    create policy "result_actions_select_own"
    on public.result_actions
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'result_actions'
      and policyname = 'result_actions_insert_own'
  ) then
    create policy "result_actions_insert_own"
    on public.result_actions
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'result_actions'
      and policyname = 'result_actions_update_own'
  ) then
    create policy "result_actions_update_own"
    on public.result_actions
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'result_actions'
      and policyname = 'result_actions_delete_own'
  ) then
    create policy "result_actions_delete_own"
    on public.result_actions
    for delete
    using (auth.uid() = user_id);
  end if;
end $$;

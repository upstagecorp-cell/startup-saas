create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  startup_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diagnosis_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  version integer not null default 1,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.diagnosis_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.diagnosis_templates(id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, key)
);

create table public.diagnosis_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.diagnosis_templates(id) on delete cascade,
  section_id uuid references public.diagnosis_template_sections(id) on delete set null,
  question_code text not null,
  question_text text not null,
  question_type text not null,
  answer_schema jsonb not null default '{}'::jsonb,
  weight numeric(5,2) not null default 1.00,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, question_code)
);

create table public.diagnosis_question_conditions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.diagnosis_questions(id) on delete cascade,
  depends_on_question_id uuid not null references public.diagnosis_questions(id) on delete cascade,
  operator text not null,
  expected_text text,
  expected_number numeric(10,2),
  expected_boolean boolean,
  expected_json jsonb not null default '{}'::jsonb,
  effect_type text not null,
  effect_value text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.diagnosis_templates(id),
  session_number integer not null,
  status text not null default 'draft',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  previous_session_id uuid references public.diagnosis_sessions(id) on delete set null,
  overall_score numeric(5,2),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_number)
);

create table public.diagnosis_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnosis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.diagnosis_questions(id),
  answer_text text,
  answer_number numeric(10,2),
  answer_boolean boolean,
  answer_json jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.diagnosis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result_version integer not null default 1,
  overall_score numeric(5,2),
  risk_level text,
  recommended_next_step text,
  created_at timestamptz not null default now()
);

create table public.diagnosis_result_dimensions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  dimension_key text not null,
  dimension_name text not null,
  score numeric(5,2),
  benchmark_score numeric(5,2),
  status text,
  summary text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (result_id, dimension_key)
);

create table public.diagnosis_result_issues (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  dimension_id uuid references public.diagnosis_result_dimensions(id) on delete set null,
  issue_type text not null,
  issue_key text not null,
  title text not null,
  description text,
  severity text,
  priority text,
  score_impact numeric(5,2),
  root_cause text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.diagnosis_result_insights (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  issue_id uuid references public.diagnosis_result_issues(id) on delete set null,
  insight_type text not null,
  title text not null,
  content text not null,
  source_type text not null default 'ai',
  source_ref text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.action_recommendations (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  issue_id uuid references public.diagnosis_result_issues(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  description text,
  rationale text,
  priority text,
  expected_impact text,
  effort_level text,
  source_type text not null default 'ai',
  source_ref text,
  recommendation_version integer not null default 1,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.action_plans (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.action_recommendations(id) on delete set null,
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  session_id uuid not null references public.diagnosis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_version integer not null default 1,
  source_type text not null default 'ai',
  source_ref text,
  title text not null,
  description text,
  status text not null default 'draft',
  priority text not null default 'medium',
  goal_metric text,
  target_value text,
  due_date date,
  adopted_from_recommendation boolean not null default false,
  created_by text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_tasks (
  id uuid primary key default gen_random_uuid(),
  action_plan_id uuid not null references public.action_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  task_type text,
  status text not null default 'todo',
  priority text not null default 'medium',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  blocked_reason text,
  owner_label text,
  sort_order integer not null default 0,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_execution_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.action_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_type text not null default 'progress_update',
  previous_status text,
  new_status text,
  previous_progress integer,
  new_progress integer,
  content text,
  evidence_json jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now()
);

create table public.ai_analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.diagnosis_sessions(id) on delete cascade,
  result_id uuid references public.diagnosis_results(id) on delete set null,
  analysis_type text not null,
  model_name text,
  prompt text,
  response text,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_diagnosis_sessions_updated_at
before update on public.diagnosis_sessions
for each row
execute function public.set_updated_at();

create trigger set_diagnosis_answers_updated_at
before update on public.diagnosis_answers
for each row
execute function public.set_updated_at();

create trigger set_action_plans_updated_at
before update on public.action_plans
for each row
execute function public.set_updated_at();

create trigger set_action_tasks_updated_at
before update on public.action_tasks
for each row
execute function public.set_updated_at();

create index idx_profiles_email on public.profiles(email);
create index idx_diagnosis_template_sections_template_id on public.diagnosis_template_sections(template_id);
create index idx_diagnosis_questions_template_id on public.diagnosis_questions(template_id);
create index idx_diagnosis_questions_section_id on public.diagnosis_questions(section_id);
create index idx_diagnosis_question_conditions_question_id on public.diagnosis_question_conditions(question_id);
create index idx_diagnosis_question_conditions_depends_on_question_id on public.diagnosis_question_conditions(depends_on_question_id);
create index idx_diagnosis_sessions_user_id on public.diagnosis_sessions(user_id);
create index idx_diagnosis_sessions_template_id on public.diagnosis_sessions(template_id);
create index idx_diagnosis_sessions_previous_session_id on public.diagnosis_sessions(previous_session_id);
create index idx_diagnosis_answers_session_id on public.diagnosis_answers(session_id);
create index idx_diagnosis_answers_user_id on public.diagnosis_answers(user_id);
create index idx_diagnosis_answers_question_id on public.diagnosis_answers(question_id);
create index idx_diagnosis_results_user_id on public.diagnosis_results(user_id);
create index idx_diagnosis_results_session_id on public.diagnosis_results(session_id);
create index idx_diagnosis_result_dimensions_result_id on public.diagnosis_result_dimensions(result_id);
create index idx_diagnosis_result_issues_result_id on public.diagnosis_result_issues(result_id);
create index idx_diagnosis_result_issues_dimension_id on public.diagnosis_result_issues(dimension_id);
create index idx_diagnosis_result_insights_result_id on public.diagnosis_result_insights(result_id);
create index idx_diagnosis_result_insights_issue_id on public.diagnosis_result_insights(issue_id);
create index idx_action_recommendations_result_id on public.action_recommendations(result_id);
create index idx_action_recommendations_issue_id on public.action_recommendations(issue_id);
create index idx_action_recommendations_user_id on public.action_recommendations(user_id);
create index idx_action_plans_recommendation_id on public.action_plans(recommendation_id);
create index idx_action_plans_result_id on public.action_plans(result_id);
create index idx_action_plans_session_id on public.action_plans(session_id);
create index idx_action_plans_user_id on public.action_plans(user_id);
create index idx_action_tasks_action_plan_id on public.action_tasks(action_plan_id);
create index idx_action_tasks_user_id on public.action_tasks(user_id);
create index idx_action_execution_logs_task_id on public.action_execution_logs(task_id);
create index idx_action_execution_logs_user_id on public.action_execution_logs(user_id);
create index idx_ai_analysis_logs_user_id on public.ai_analysis_logs(user_id);
create index idx_ai_analysis_logs_session_id on public.ai_analysis_logs(session_id);
create index idx_ai_analysis_logs_result_id on public.ai_analysis_logs(result_id);

alter table public.profiles enable row level security;
alter table public.diagnosis_templates enable row level security;
alter table public.diagnosis_template_sections enable row level security;
alter table public.diagnosis_questions enable row level security;
alter table public.diagnosis_question_conditions enable row level security;
alter table public.diagnosis_sessions enable row level security;
alter table public.diagnosis_answers enable row level security;
alter table public.diagnosis_results enable row level security;
alter table public.diagnosis_result_dimensions enable row level security;
alter table public.diagnosis_result_issues enable row level security;
alter table public.diagnosis_result_insights enable row level security;
alter table public.action_recommendations enable row level security;
alter table public.action_plans enable row level security;
alter table public.action_tasks enable row level security;
alter table public.action_execution_logs enable row level security;
alter table public.ai_analysis_logs enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "diagnosis_templates_select_authenticated"
on public.diagnosis_templates
for select
using (auth.uid() is not null);

create policy "diagnosis_template_sections_select_authenticated"
on public.diagnosis_template_sections
for select
using (auth.uid() is not null);

create policy "diagnosis_questions_select_authenticated"
on public.diagnosis_questions
for select
using (auth.uid() is not null);

create policy "diagnosis_question_conditions_select_authenticated"
on public.diagnosis_question_conditions
for select
using (auth.uid() is not null);

create policy "diagnosis_sessions_select_own"
on public.diagnosis_sessions
for select
using (auth.uid() = user_id);

create policy "diagnosis_sessions_insert_own"
on public.diagnosis_sessions
for insert
with check (auth.uid() = user_id);

create policy "diagnosis_sessions_update_own"
on public.diagnosis_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "diagnosis_sessions_delete_own"
on public.diagnosis_sessions
for delete
using (auth.uid() = user_id);

create policy "diagnosis_answers_select_own"
on public.diagnosis_answers
for select
using (auth.uid() = user_id);

create policy "diagnosis_answers_insert_own"
on public.diagnosis_answers
for insert
with check (auth.uid() = user_id);

create policy "diagnosis_answers_update_own"
on public.diagnosis_answers
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "diagnosis_answers_delete_own"
on public.diagnosis_answers
for delete
using (auth.uid() = user_id);

create policy "diagnosis_results_select_own"
on public.diagnosis_results
for select
using (auth.uid() = user_id);

create policy "diagnosis_results_insert_own"
on public.diagnosis_results
for insert
with check (auth.uid() = user_id);

create policy "diagnosis_results_update_own"
on public.diagnosis_results
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "diagnosis_results_delete_own"
on public.diagnosis_results
for delete
using (auth.uid() = user_id);

create policy "diagnosis_result_dimensions_select_own"
on public.diagnosis_result_dimensions
for select
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_dimensions_insert_own"
on public.diagnosis_result_dimensions
for insert
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_dimensions_update_own"
on public.diagnosis_result_dimensions
for update
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_dimensions_delete_own"
on public.diagnosis_result_dimensions
for delete
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issues_select_own"
on public.diagnosis_result_issues
for select
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issues_insert_own"
on public.diagnosis_result_issues
for insert
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issues_update_own"
on public.diagnosis_result_issues
for update
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issues_delete_own"
on public.diagnosis_result_issues
for delete
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_insights_select_own"
on public.diagnosis_result_insights
for select
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_insights_insert_own"
on public.diagnosis_result_insights
for insert
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_insights_update_own"
on public.diagnosis_result_insights
for update
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_insights_delete_own"
on public.diagnosis_result_insights
for delete
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "action_recommendations_select_own"
on public.action_recommendations
for select
using (auth.uid() = user_id);

create policy "action_recommendations_insert_own"
on public.action_recommendations
for insert
with check (auth.uid() = user_id);

create policy "action_recommendations_update_own"
on public.action_recommendations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "action_recommendations_delete_own"
on public.action_recommendations
for delete
using (auth.uid() = user_id);

create policy "action_plans_select_own"
on public.action_plans
for select
using (auth.uid() = user_id);

create policy "action_plans_insert_own"
on public.action_plans
for insert
with check (auth.uid() = user_id);

create policy "action_plans_update_own"
on public.action_plans
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "action_plans_delete_own"
on public.action_plans
for delete
using (auth.uid() = user_id);

create policy "action_tasks_select_own"
on public.action_tasks
for select
using (auth.uid() = user_id);

create policy "action_tasks_insert_own"
on public.action_tasks
for insert
with check (auth.uid() = user_id);

create policy "action_tasks_update_own"
on public.action_tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "action_tasks_delete_own"
on public.action_tasks
for delete
using (auth.uid() = user_id);

create policy "action_execution_logs_select_own"
on public.action_execution_logs
for select
using (auth.uid() = user_id);

create policy "action_execution_logs_insert_own"
on public.action_execution_logs
for insert
with check (auth.uid() = user_id);

create policy "action_execution_logs_update_own"
on public.action_execution_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "action_execution_logs_delete_own"
on public.action_execution_logs
for delete
using (auth.uid() = user_id);

create policy "ai_analysis_logs_select_own"
on public.ai_analysis_logs
for select
using (auth.uid() = user_id);

create policy "ai_analysis_logs_insert_own"
on public.ai_analysis_logs
for insert
with check (auth.uid() = user_id);

create policy "ai_analysis_logs_update_own"
on public.ai_analysis_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_analysis_logs_delete_own"
on public.ai_analysis_logs
for delete
using (auth.uid() = user_id);

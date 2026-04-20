create table if not exists public.diagnosis_issue_definitions (
  id uuid primary key default gen_random_uuid(),
  dimension_key text not null,
  issue_key text not null unique,
  title text not null,
  description text,
  trigger_status text,
  min_score numeric(5,2),
  max_score numeric(5,2),
  severity text,
  priority text,
  score_impact numeric(5,2),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnosis_issue_cause_definitions (
  id uuid primary key default gen_random_uuid(),
  issue_definition_id uuid not null references public.diagnosis_issue_definitions(id) on delete cascade,
  cause_key text not null,
  title text not null,
  description text,
  match_rule jsonb not null default '{}'::jsonb,
  confidence_weight numeric(5,2),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (issue_definition_id, cause_key)
);

create table if not exists public.diagnosis_action_templates (
  id uuid primary key default gen_random_uuid(),
  cause_key text not null,
  recommendation_type text not null,
  title text not null,
  description text,
  rationale text,
  priority text,
  expected_impact text,
  effort_level text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnosis_result_issue_causes (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.diagnosis_results(id) on delete cascade,
  issue_id uuid not null references public.diagnosis_result_issues(id) on delete cascade,
  cause_key text not null,
  title text not null,
  description text,
  confidence_score numeric(5,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (result_id, issue_id, cause_key)
);

create index if not exists idx_diagnosis_issue_definitions_dimension_key
  on public.diagnosis_issue_definitions(dimension_key);

create index if not exists idx_diagnosis_issue_cause_definitions_issue_definition_id
  on public.diagnosis_issue_cause_definitions(issue_definition_id);

create index if not exists idx_diagnosis_action_templates_cause_key
  on public.diagnosis_action_templates(cause_key);

create index if not exists idx_diagnosis_result_issue_causes_result_id
  on public.diagnosis_result_issue_causes(result_id);

create index if not exists idx_diagnosis_result_issue_causes_issue_id
  on public.diagnosis_result_issue_causes(issue_id);

create unique index if not exists idx_diagnosis_result_issues_result_issue_key
  on public.diagnosis_result_issues(result_id, issue_key);

alter table public.diagnosis_issue_definitions enable row level security;
alter table public.diagnosis_issue_cause_definitions enable row level security;
alter table public.diagnosis_action_templates enable row level security;
alter table public.diagnosis_result_issue_causes enable row level security;

create policy "diagnosis_issue_definitions_select_authenticated"
on public.diagnosis_issue_definitions
for select
using (auth.uid() is not null);

create policy "diagnosis_issue_cause_definitions_select_authenticated"
on public.diagnosis_issue_cause_definitions
for select
using (auth.uid() is not null);

create policy "diagnosis_action_templates_select_authenticated"
on public.diagnosis_action_templates
for select
using (auth.uid() is not null);

create policy "diagnosis_result_issue_causes_select_own"
on public.diagnosis_result_issue_causes
for select
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issue_causes_insert_own"
on public.diagnosis_result_issue_causes
for insert
with check (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

create policy "diagnosis_result_issue_causes_update_own"
on public.diagnosis_result_issue_causes
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

create policy "diagnosis_result_issue_causes_delete_own"
on public.diagnosis_result_issue_causes
for delete
using (
  exists (
    select 1
    from public.diagnosis_results dr
    where dr.id = result_id
      and dr.user_id = auth.uid()
  )
);

insert into public.diagnosis_issue_definitions (
  dimension_key,
  issue_key,
  title,
  description,
  trigger_status,
  max_score,
  severity,
  priority,
  score_impact,
  sort_order
)
values
  ('problem', 'problem_validation_gap', 'Problem validation gap', 'The current problem statement is not yet validated with enough evidence from real users.', 'critical', 54.99, 'high', 'high', 30, 10),
  ('customer', 'customer_clarity_gap', 'Customer clarity gap', 'Target customer definition and validation signals are still weak.', 'critical', 54.99, 'high', 'high', 28, 20),
  ('solution', 'solution_fit_gap', 'Solution fit gap', 'The proposed solution is not yet specific enough for the diagnosed customer problem.', 'critical', 54.99, 'high', 'high', 27, 30),
  ('market', 'market_focus_gap', 'Market focus gap', 'The selected market is still too broad or lacks a clear initial wedge.', 'critical', 54.99, 'high', 'high', 26, 40),
  ('revenue', 'revenue_model_gap', 'Revenue model gap', 'The revenue model is not yet validated with a believable pricing path.', 'critical', 54.99, 'high', 'high', 29, 50),
  ('execution', 'execution_focus_gap', 'Execution focus gap', 'Execution rhythm and next-step prioritization are not consistent enough yet.', 'critical', 54.99, 'high', 'medium', 24, 30),
  ('problem', 'problem_validation_warning', 'Problem validation warning', 'The problem area has some traction, but the validation depth is still moderate.', 'moderate', 79.99, 'medium', 'medium', 16, 40),
  ('customer', 'customer_clarity_warning', 'Customer clarity warning', 'Customer understanding exists, but it is not strong enough to guide repeatable decisions.', 'moderate', 79.99, 'medium', 'medium', 14, 50),
  ('solution', 'solution_fit_warning', 'Solution fit warning', 'The solution direction is promising, but the offer still needs sharper proof and scope.', 'moderate', 79.99, 'medium', 'medium', 13, 60),
  ('market', 'market_focus_warning', 'Market focus warning', 'The market choice has potential, but entry focus is still not sharp enough.', 'moderate', 79.99, 'medium', 'medium', 12, 70),
  ('revenue', 'revenue_model_warning', 'Revenue model warning', 'The monetization path exists, but willingness-to-pay evidence is still limited.', 'moderate', 79.99, 'medium', 'medium', 15, 80),
  ('execution', 'execution_focus_warning', 'Execution focus warning', 'Execution has momentum, but the team still needs sharper priorities.', 'moderate', 79.99, 'medium', 'medium', 12, 60)
on conflict (issue_key) do nothing;

insert into public.diagnosis_issue_cause_definitions (
  issue_definition_id,
  cause_key,
  title,
  description,
  match_rule,
  confidence_weight,
  sort_order
)
select
  did.id,
  seeded.cause_key,
  seeded.title,
  seeded.description,
  seeded.match_rule::jsonb,
  seeded.confidence_weight,
  seeded.sort_order
from public.diagnosis_issue_definitions did
join (
  values
    ('problem_validation_gap', 'problem_interview_shortage', 'Low interview evidence', 'The team likely has not gathered enough structured user interview evidence.', '{"dimension_statuses":["critical"]}', 0.90, 10),
    ('customer_clarity_gap', 'customer_segment_blur', 'Blurred customer segment', 'The ICP or early adopter segment is still too broad or ambiguous.', '{"dimension_statuses":["critical"]}', 0.88, 20),
    ('solution_fit_gap', 'solution_value_prop_blur', 'Blurred value proposition', 'The current solution does not yet express one sharp promise tied to the target pain.', '{"dimension_statuses":["critical"]}', 0.87, 30),
    ('market_focus_gap', 'market_entry_blur', 'Unclear entry market', 'The first target market is still too broad to guide focused execution.', '{"dimension_statuses":["critical"]}', 0.86, 40),
    ('revenue_model_gap', 'revenue_pricing_unclear', 'Pricing path unclear', 'Pricing logic and willingness-to-pay signals are not yet concrete enough.', '{"dimension_statuses":["critical"]}', 0.89, 50),
    ('execution_focus_gap', 'execution_priority_drift', 'Priority drift', 'Execution appears fragmented across too many competing tasks.', '{"dimension_statuses":["critical"]}', 0.86, 30),
    ('problem_validation_warning', 'problem_signal_depth', 'Validation depth needs improvement', 'Some signals exist, but they are not strong enough yet for confidence.', '{"dimension_statuses":["moderate"]}', 0.70, 40),
    ('customer_clarity_warning', 'customer_signal_depth', 'Customer evidence needs improvement', 'Customer learning exists but is not yet decisive.', '{"dimension_statuses":["moderate"]}', 0.68, 50),
    ('solution_fit_warning', 'solution_scope_needs_focus', 'Solution scope needs focus', 'The solution may be trying to solve too much at once for the current stage.', '{"dimension_statuses":["moderate"]}', 0.67, 60),
    ('market_focus_warning', 'market_signal_depth', 'Market evidence needs improvement', 'The selected market looks plausible, but entry proof is still thin.', '{"dimension_statuses":["moderate"]}', 0.66, 70),
    ('revenue_model_warning', 'revenue_signal_depth', 'Revenue evidence needs improvement', 'Revenue intent is visible, but concrete payment signals are still weak.', '{"dimension_statuses":["moderate"]}', 0.69, 80),
    ('execution_focus_warning', 'execution_alignment_gap', 'Execution alignment needs improvement', 'The team may need a tighter operating cadence and clearer ownership.', '{"dimension_statuses":["moderate"]}', 0.66, 60)
) as seeded(issue_key, cause_key, title, description, match_rule, confidence_weight, sort_order)
  on seeded.issue_key = did.issue_key
on conflict (issue_definition_id, cause_key) do nothing;

insert into public.diagnosis_action_templates (
  cause_key,
  recommendation_type,
  title,
  description,
  rationale,
  priority,
  expected_impact,
  effort_level,
  sort_order
)
values
  ('problem_interview_shortage', 'validation', 'Run 10 focused customer interviews', 'Interview a narrow set of target users and document repeated pain patterns.', 'This closes the evidence gap behind the weak problem score.', 'high', 'Clearer problem evidence and stronger prioritization inputs.', 'medium', 10),
  ('customer_segment_blur', 'segmentation', 'Define one ICP and one beachhead segment', 'Rewrite the target customer profile around a single urgent use case and buyer context.', 'Sharper segmentation improves messaging, validation, and acquisition choices.', 'high', 'More consistent customer discovery and decision-making.', 'low', 20),
  ('solution_value_prop_blur', 'solution', 'Rewrite the core value proposition', 'Reduce the solution promise to one target user, one painful job, and one primary outcome.', 'A sharper value proposition makes solution validation easier and faster.', 'high', 'Better solution clarity and stronger user testing.', 'low', 25),
  ('market_entry_blur', 'market', 'Choose one initial market wedge', 'Select one narrow entry market with a clear buyer group, use case, and distribution path.', 'Focused market selection improves learning speed and go-to-market discipline.', 'high', 'More consistent market learning and tighter execution.', 'medium', 28),
  ('revenue_pricing_unclear', 'revenue', 'Test one pricing hypothesis', 'Define one pricing model and validate it with direct willingness-to-pay conversations.', 'Revenue gaps close faster when pricing assumptions are tested directly.', 'high', 'Stronger revenue logic and clearer monetization decisions.', 'medium', 29),
  ('execution_priority_drift', 'execution', 'Create a 2-week execution plan', 'Select one core objective, assign owners, and limit work-in-progress for the next 2 weeks.', 'A tighter cadence reduces execution drift and creates measurable progress.', 'medium', 'Higher delivery consistency and clearer operational focus.', 'low', 30),
  ('problem_signal_depth', 'validation', 'Collect stronger validation evidence', 'Add a simple evidence tracker for interviews, repeated pains, and willingness-to-pay signals.', 'Moderate scores improve fastest when signal quality becomes more structured.', 'medium', 'Better confidence in the diagnosed problem area.', 'low', 40),
  ('customer_signal_depth', 'segmentation', 'Tighten customer learning loop', 'Review recent conversations and cluster them into recurring customer patterns.', 'This turns partial customer learning into clearer segments and priorities.', 'medium', 'More reliable targeting and offer positioning.', 'low', 50),
  ('solution_scope_needs_focus', 'solution', 'Narrow the MVP scope', 'Remove secondary features and define the smallest believable solution for the main pain.', 'Moderate solution scores often improve when scope becomes sharper.', 'medium', 'Clearer MVP definition and faster validation cycles.', 'low', 55),
  ('market_signal_depth', 'market', 'Strengthen market entry evidence', 'List the top three market assumptions and validate them through focused discovery.', 'This converts a broad market thesis into a more defensible entry choice.', 'medium', 'Better market confidence and lower go-to-market waste.', 'low', 58),
  ('revenue_signal_depth', 'revenue', 'Track purchase intent signals', 'Capture buying interest, pricing reactions, and objection patterns in a lightweight revenue log.', 'This helps move from abstract monetization ideas to measurable signals.', 'medium', 'Better pricing evidence and clearer revenue readiness.', 'low', 59),
  ('execution_alignment_gap', 'execution', 'Review priorities with a weekly operating cadence', 'Set one weekly review to trim priorities, unblock tasks, and track progress.', 'Execution warnings often come from inconsistent alignment rather than lack of effort.', 'medium', 'Improved focus and better throughput.', 'low', 60)
on conflict do nothing;

create or replace function public.persist_diagnosis_artifacts(
  p_result_id uuid,
  p_user_id uuid,
  p_issue_rows jsonb,
  p_cause_rows jsonb,
  p_recommendation_rows jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_result_id uuid;
begin
  select dr.id
    into v_result_id
  from public.diagnosis_results dr
  where dr.id = p_result_id
    and dr.user_id = p_user_id;

  if v_result_id is null then
    raise exception 'Diagnosis result not found for result_id=% and user_id=%', p_result_id, p_user_id;
  end if;

  delete from public.action_recommendations
  where result_id = v_result_id
    and user_id = p_user_id;

  delete from public.diagnosis_result_issue_causes
  where result_id = v_result_id;

  delete from public.diagnosis_result_issues
  where result_id = v_result_id;

  if jsonb_typeof(coalesce(p_issue_rows, '[]'::jsonb)) = 'array' then
    insert into public.diagnosis_result_issues (
      result_id,
      dimension_id,
      issue_type,
      issue_key,
      title,
      description,
      severity,
      priority,
      score_impact,
      root_cause,
      sort_order
    )
    select
      v_result_id,
      drd.id,
      'rule_based',
      payload.issue_key,
      payload.title,
      payload.description,
      payload.severity,
      payload.priority,
      payload.score_impact,
      payload.root_cause,
      coalesce(payload.sort_order, 0)
    from jsonb_to_recordset(coalesce(p_issue_rows, '[]'::jsonb)) as payload(
      dimension_key text,
      issue_key text,
      title text,
      description text,
      severity text,
      priority text,
      score_impact numeric,
      root_cause text,
      sort_order integer
    )
    join public.diagnosis_result_dimensions drd
      on drd.result_id = v_result_id
     and drd.dimension_key = payload.dimension_key
    where payload.issue_key is not null
      and payload.title is not null
    on conflict (result_id, issue_key) do update
    set dimension_id = excluded.dimension_id,
        issue_type = excluded.issue_type,
        title = excluded.title,
        description = excluded.description,
        severity = excluded.severity,
        priority = excluded.priority,
        score_impact = excluded.score_impact,
        root_cause = excluded.root_cause,
        sort_order = excluded.sort_order;
  end if;

  if jsonb_typeof(coalesce(p_cause_rows, '[]'::jsonb)) = 'array' then
    insert into public.diagnosis_result_issue_causes (
      result_id,
      issue_id,
      cause_key,
      title,
      description,
      confidence_score,
      sort_order
    )
    select
      v_result_id,
      dri.id,
      payload.cause_key,
      payload.title,
      payload.description,
      payload.confidence_score,
      coalesce(payload.sort_order, 0)
    from jsonb_to_recordset(coalesce(p_cause_rows, '[]'::jsonb)) as payload(
      issue_key text,
      cause_key text,
      title text,
      description text,
      confidence_score numeric,
      sort_order integer
    )
    join public.diagnosis_result_issues dri
      on dri.result_id = v_result_id
     and dri.issue_key = payload.issue_key
    where payload.cause_key is not null
      and payload.title is not null
    on conflict (result_id, issue_id, cause_key) do update
    set title = excluded.title,
        description = excluded.description,
        confidence_score = excluded.confidence_score,
        sort_order = excluded.sort_order;
  end if;

  if jsonb_typeof(coalesce(p_recommendation_rows, '[]'::jsonb)) = 'array' then
    insert into public.action_recommendations (
      result_id,
      issue_id,
      user_id,
      recommendation_type,
      title,
      description,
      rationale,
      priority,
      expected_impact,
      effort_level,
      source_type,
      source_ref
    )
    select
      v_result_id,
      dri.id,
      p_user_id,
      payload.recommendation_type,
      payload.title,
      payload.description,
      payload.rationale,
      payload.priority,
      payload.expected_impact,
      payload.effort_level,
      'rule_based',
      payload.cause_key
    from jsonb_to_recordset(coalesce(p_recommendation_rows, '[]'::jsonb)) as payload(
      issue_key text,
      cause_key text,
      recommendation_type text,
      title text,
      description text,
      rationale text,
      priority text,
      expected_impact text,
      effort_level text
    )
    join public.diagnosis_result_issues dri
      on dri.result_id = v_result_id
     and dri.issue_key = payload.issue_key
    where payload.recommendation_type is not null
      and payload.title is not null;
  end if;

  return v_result_id;
end;
$$;

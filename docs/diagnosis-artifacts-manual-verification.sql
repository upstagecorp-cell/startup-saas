-- Diagnosis Artifacts Manual Verification SQL
-- Replace the placeholder values before running.

-- =========================================================
-- 0. Inputs
-- =========================================================

-- Example:
-- \set session_id '00000000-0000-0000-0000-000000000000'
-- \set result_id  '00000000-0000-0000-0000-000000000000'

-- If your SQL editor does not support variables, replace :'session_id'
-- and :'result_id' manually with literal UUID values.

-- =========================================================
-- 1. Migration / schema existence checks
-- =========================================================

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'diagnosis_issue_definitions',
    'diagnosis_issue_cause_definitions',
    'diagnosis_action_templates',
    'diagnosis_result_issue_causes',
    'diagnosis_result_issues',
    'action_recommendations'
  )
order by table_name;

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'persist_diagnosis_result',
    'persist_diagnosis_artifacts'
  )
order by routine_name;

select
  'missing_tables' as check_name,
  expected.table_name
from (
  values
    ('diagnosis_issue_definitions'),
    ('diagnosis_issue_cause_definitions'),
    ('diagnosis_action_templates'),
    ('diagnosis_result_issue_causes'),
    ('diagnosis_result_issues'),
    ('action_recommendations')
) as expected(table_name)
left join information_schema.tables actual
  on actual.table_schema = 'public'
 and actual.table_name = expected.table_name
where actual.table_name is null;

select
  'missing_functions' as check_name,
  expected.routine_name
from (
  values
    ('persist_diagnosis_result'),
    ('persist_diagnosis_artifacts')
) as expected(routine_name)
left join information_schema.routines actual
  on actual.routine_schema = 'public'
 and actual.routine_name = expected.routine_name
where actual.routine_name is null;

-- =========================================================
-- 2. Actual section / dimension structure checks
-- =========================================================

select
  dt.code as template_code,
  dts.key as section_key,
  dts.title as section_title,
  dts.sort_order
from public.diagnosis_template_sections dts
join public.diagnosis_templates dt
  on dt.id = dts.template_id
where dt.is_active = true
order by dt.code, dts.sort_order, dts.key;

select
  dt.code as template_code,
  dts.key as section_key,
  count(dq.id) as question_count
from public.diagnosis_template_sections dts
join public.diagnosis_templates dt
  on dt.id = dts.template_id
left join public.diagnosis_questions dq
  on dq.section_id = dts.id
 and dq.is_active = true
where dt.is_active = true
group by dt.code, dts.key
order by dt.code, dts.key;

select distinct
  drd.dimension_key
from public.diagnosis_result_dimensions drd
order by drd.dimension_key;

select distinct
  did.dimension_key
from public.diagnosis_issue_definitions did
order by did.dimension_key;

-- =========================================================
-- 3. Seed definition checks
-- =========================================================

select
  dimension_key,
  issue_key,
  trigger_status,
  min_score,
  max_score,
  severity,
  priority,
  sort_order
from public.diagnosis_issue_definitions
order by dimension_key, sort_order, issue_key;

select
  did.dimension_key,
  did.issue_key,
  dicd.cause_key,
  dicd.title,
  dicd.confidence_weight,
  dicd.sort_order
from public.diagnosis_issue_cause_definitions dicd
join public.diagnosis_issue_definitions did
  on did.id = dicd.issue_definition_id
order by did.dimension_key, did.issue_key, dicd.sort_order;

select
  cause_key,
  recommendation_type,
  title,
  priority,
  effort_level,
  sort_order
from public.diagnosis_action_templates
order by cause_key, sort_order, title;

select
  (select count(*) from public.diagnosis_issue_definitions) as issue_definition_count,
  (select count(*) from public.diagnosis_issue_cause_definitions) as cause_definition_count,
  (select count(*) from public.diagnosis_action_templates) as action_template_count;

-- =========================================================
-- 4. Session-based result lookup
-- =========================================================

select
  ds.id as session_id,
  ds.user_id,
  ds.status as session_status,
  ds.overall_score as session_overall_score,
  dr.id as result_id,
  dr.overall_score as result_overall_score,
  dr.risk_level,
  dr.recommended_next_step,
  dr.created_at as result_created_at
from public.diagnosis_sessions ds
left join public.diagnosis_results dr
  on dr.session_id = ds.id
where ds.id = :'session_id';

select
  drd.id,
  drd.result_id,
  drd.dimension_key,
  drd.dimension_name,
  drd.score,
  drd.status,
  drd.summary,
  drd.sort_order
from public.diagnosis_result_dimensions drd
join public.diagnosis_results dr
  on dr.id = drd.result_id
where dr.session_id = :'session_id'
order by drd.sort_order, drd.dimension_key;

select
  dri.id,
  dri.result_id,
  drd.dimension_key,
  dri.issue_key,
  dri.title,
  dri.severity,
  dri.priority,
  dri.score_impact,
  dri.sort_order
from public.diagnosis_result_issues dri
left join public.diagnosis_result_dimensions drd
  on drd.id = dri.dimension_id
join public.diagnosis_results dr
  on dr.id = dri.result_id
where dr.session_id = :'session_id'
order by dri.sort_order, dri.issue_key;

select
  dric.id,
  dric.result_id,
  dri.issue_key,
  dric.cause_key,
  dric.title,
  dric.confidence_score,
  dric.sort_order
from public.diagnosis_result_issue_causes dric
join public.diagnosis_result_issues dri
  on dri.id = dric.issue_id
join public.diagnosis_results dr
  on dr.id = dric.result_id
where dr.session_id = :'session_id'
order by dri.issue_key, dric.sort_order, dric.cause_key;

select
  ar.id,
  ar.result_id,
  dri.issue_key,
  ar.recommendation_type,
  ar.title,
  ar.priority,
  ar.effort_level,
  ar.source_type,
  ar.source_ref,
  ar.created_at
from public.action_recommendations ar
left join public.diagnosis_result_issues dri
  on dri.id = ar.issue_id
join public.diagnosis_results dr
  on dr.id = ar.result_id
where dr.session_id = :'session_id'
order by ar.created_at, ar.title;

-- =========================================================
-- 5. Result-based joined verification view
-- =========================================================

select
  dr.id as result_id,
  drd.dimension_key,
  drd.score as dimension_score,
  drd.status as dimension_status,
  dri.issue_key,
  dri.title as issue_title,
  dri.priority as issue_priority,
  dric.cause_key,
  dric.title as cause_title,
  ar.title as recommendation_title,
  ar.recommendation_type,
  ar.priority as recommendation_priority,
  ar.effort_level
from public.diagnosis_results dr
left join public.diagnosis_result_dimensions drd
  on drd.result_id = dr.id
left join public.diagnosis_result_issues dri
  on dri.result_id = dr.id
 and dri.dimension_id = drd.id
left join public.diagnosis_result_issue_causes dric
  on dric.result_id = dr.id
 and dric.issue_id = dri.id
left join public.action_recommendations ar
  on ar.result_id = dr.id
 and ar.issue_id = dri.id
where dr.id = :'result_id'
order by drd.sort_order, dri.sort_order, dric.sort_order, ar.created_at;

-- =========================================================
-- 6. Count checks
-- =========================================================

select
  dr.id as result_id,
  count(distinct drd.id) as dimension_count,
  count(distinct dri.id) as issue_count,
  count(distinct dric.id) as cause_count,
  count(distinct ar.id) as recommendation_count
from public.diagnosis_results dr
left join public.diagnosis_result_dimensions drd
  on drd.result_id = dr.id
left join public.diagnosis_result_issues dri
  on dri.result_id = dr.id
left join public.diagnosis_result_issue_causes dric
  on dric.result_id = dr.id
left join public.action_recommendations ar
  on ar.result_id = dr.id
where dr.id = :'result_id'
group by dr.id;

-- =========================================================
-- 7. Seed-to-result consistency checks
-- =========================================================

select
  did.dimension_key,
  did.issue_key,
  did.trigger_status,
  did.min_score,
  did.max_score,
  case
    when dicd.cause_key is null then 'missing_cause'
    else 'ok'
  end as cause_link_status,
  case
    when dat.cause_key is null then 'missing_action_template'
    else 'ok'
  end as action_link_status
from public.diagnosis_issue_definitions did
left join public.diagnosis_issue_cause_definitions dicd
  on dicd.issue_definition_id = did.id
left join public.diagnosis_action_templates dat
  on dat.cause_key = dicd.cause_key
order by did.dimension_key, did.sort_order, did.issue_key;

-- =========================================================
-- 8. Key mismatch / orphan checks
-- =========================================================

select
  section_keys.section_key as template_section_key
from (
  select distinct dts.key as section_key
  from public.diagnosis_template_sections dts
  join public.diagnosis_templates dt
    on dt.id = dts.template_id
  where dt.is_active = true
) as section_keys
left join (
  select distinct did.dimension_key
  from public.diagnosis_issue_definitions did
) as seed_keys
  on seed_keys.dimension_key = section_keys.section_key
where seed_keys.dimension_key is null
order by section_keys.section_key;

select
  seed_keys.dimension_key as seed_dimension_key
from (
  select distinct did.dimension_key
  from public.diagnosis_issue_definitions did
) as seed_keys
left join (
  select distinct dts.key as section_key
  from public.diagnosis_template_sections dts
  join public.diagnosis_templates dt
    on dt.id = dts.template_id
  where dt.is_active = true
) as section_keys
  on section_keys.section_key = seed_keys.dimension_key
where section_keys.section_key is null
order by seed_keys.dimension_key;

select
  did.dimension_key,
  did.issue_key,
  did.title
from public.diagnosis_issue_definitions did
left join (
  select distinct dts.key as section_key
  from public.diagnosis_template_sections dts
  join public.diagnosis_templates dt
    on dt.id = dts.template_id
  where dt.is_active = true
) as section_keys
  on section_keys.section_key = did.dimension_key
where section_keys.section_key is null
order by did.dimension_key, did.issue_key;

select
  dat.cause_key,
  dat.title,
  dat.recommendation_type
from public.diagnosis_action_templates dat
left join public.diagnosis_issue_cause_definitions dicd
  on dicd.cause_key = dat.cause_key
where dicd.cause_key is null
order by dat.cause_key, dat.title;

-- =========================================================
-- 9. Expected skip-safe state check
-- =========================================================

select
  dr.id as result_id,
  exists (
    select 1
    from public.diagnosis_result_dimensions drd
    where drd.result_id = dr.id
  ) as has_dimensions,
  exists (
    select 1
    from public.diagnosis_result_issues dri
    where dri.result_id = dr.id
  ) as has_issues,
  exists (
    select 1
    from public.action_recommendations ar
    where ar.result_id = dr.id
  ) as has_recommendations
from public.diagnosis_results dr
where dr.id = :'result_id';

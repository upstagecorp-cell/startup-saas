alter table public.diagnosis_questions
add column if not exists help_text text;

with founder_template as (
  select id
  from public.diagnosis_templates
  where code = 'founder_diagnosis'
),
sections as (
  select dts.id, dts.key, dts.template_id
  from public.diagnosis_template_sections dts
  join founder_template ft
    on ft.id = dts.template_id
),
question_seed as (
  select *
  from (
    values
      (
        'problem',
        'foot_traffic_level',
        'How strong is the expected foot traffic around your location?',
        'Estimate the local walk-in or pass-by demand for the target time window.',
        'single_choice',
        '{"business_types":["offline"],"options":[{"value":"very_low","label":"Very low","score":15},{"value":"low","label":"Low","score":35},{"value":"moderate","label":"Moderate","score":60},{"value":"high","label":"High","score":80},{"value":"very_high","label":"Very high","score":100}]}'::jsonb,
        1.25::numeric,
        true,
        210
      ),
      (
        'market',
        'nearby_competitors_count',
        'How many similar competitors are located nearby?',
        'Enter the approximate number of close local competitors in your target area.',
        'number',
        '{"business_types":["offline"],"scoring_method":"linear","min":0,"max":10,"direction":"desc"}'::jsonb,
        1.10::numeric,
        true,
        220
      ),
      (
        'revenue',
        'average_price_per_customer',
        'What is the expected average price per customer?',
        'Enter your estimated average order value or average spend per customer in local currency.',
        'number',
        '{"business_types":["offline"],"scoring_method":"linear","min":0,"max":100000}'::jsonb,
        1.10::numeric,
        true,
        230
      ),
      (
        'customer',
        'expected_daily_customers',
        'How many customers do you expect to serve per day?',
        'Estimate a realistic average day once the location is operating normally.',
        'number',
        '{"business_types":["offline"],"scoring_method":"linear","min":0,"max":100}'::jsonb,
        1.20::numeric,
        true,
        240
      ),
      (
        'solution',
        'seating_capacity',
        'What is the expected seating or service capacity at one time?',
        'If seating is not relevant, enter the simultaneous service capacity you can handle.',
        'number',
        '{"business_types":["offline"],"scoring_method":"range","good_min":10,"good_max":40,"tolerance":30}'::jsonb,
        1.00::numeric,
        true,
        250
      ),
      (
        'solution',
        'turnover_rate',
        'How quickly can you turn over customers or service slots?',
        'Choose the expected customer turnover rate during operating hours.',
        'single_choice',
        '{"business_types":["offline"],"options":[{"value":"slow","label":"Slow","score":30},{"value":"moderate","label":"Moderate","score":60},{"value":"fast","label":"Fast","score":85},{"value":"very_fast","label":"Very fast","score":100}]}'::jsonb,
        1.00::numeric,
        true,
        260
      ),
      (
        'revenue',
        'monthly_fixed_costs',
        'What are the expected monthly fixed costs for rent and core operations?',
        'Enter your estimated monthly fixed costs in local currency, including rent and baseline labor.',
        'number',
        '{"business_types":["offline"],"scoring_method":"linear","min":0,"max":10000000,"direction":"desc"}'::jsonb,
        1.20::numeric,
        true,
        270
      ),
      (
        'execution',
        'staffing_readiness',
        'How ready is your staffing plan for launch and ongoing operations?',
        'Rate this from 1 (not ready) to 5 (roles, shifts, and backup plan are ready).',
        'scale',
        '{"business_types":["offline"],"min":1,"max":5,"step":1}'::jsonb,
        1.20::numeric,
        true,
        280
      )
  ) as seeded(
    section_key,
    question_code,
    question_text,
    help_text,
    question_type,
    answer_schema,
    weight,
    is_required,
    sort_order
  )
)
insert into public.diagnosis_questions (
  template_id,
  section_id,
  question_code,
  question_text,
  help_text,
  question_type,
  answer_schema,
  weight,
  sort_order,
  is_required,
  is_active
)
select
  sections.template_id,
  sections.id,
  question_seed.question_code,
  question_seed.question_text,
  question_seed.help_text,
  question_seed.question_type,
  question_seed.answer_schema,
  question_seed.weight,
  question_seed.sort_order,
  question_seed.is_required,
  true
from question_seed
join sections
  on sections.key = question_seed.section_key
on conflict (template_id, question_code) do update
set section_id = excluded.section_id,
    question_text = excluded.question_text,
    help_text = excluded.help_text,
    question_type = excluded.question_type,
    answer_schema = excluded.answer_schema,
    weight = excluded.weight,
    sort_order = excluded.sort_order,
    is_required = excluded.is_required,
    is_active = excluded.is_active;

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
    ('market_focus_gap', 'offline_local_competition_pressure', 'Local competition pressure is too high', 'The offline location may face too much nearby competition for the current offer and wedge.', '{"question_codes_any":["nearby_competitors_count"],"max_question_score":49}', 0.90, 44),
    ('market_focus_warning', 'offline_local_competition_pressure_warning', 'Local competition needs closer review', 'The area may still be viable, but the local competitor landscape needs stronger proof.', '{"question_codes_any":["nearby_competitors_count"],"min_question_score":50,"max_question_score":79}', 0.72, 74),
    ('problem_validation_gap', 'offline_foot_traffic_uncertain', 'Foot traffic assumptions are too weak', 'The location may not have enough real demand flow to support the business model.', '{"question_codes_any":["foot_traffic_level"],"max_question_score":49}', 0.91, 14),
    ('problem_validation_warning', 'offline_foot_traffic_uncertain_warning', 'Foot traffic needs stronger validation', 'Demand flow may exist, but it is not yet proven strongly enough for confidence.', '{"question_codes_any":["foot_traffic_level"],"min_question_score":50,"max_question_score":79}', 0.73, 44),
    ('revenue_model_gap', 'offline_daily_revenue_unclear', 'Daily revenue assumptions are too weak', 'Average price, customer count, or fixed costs do not yet support a believable daily revenue model.', '{"question_codes_any":["average_price_per_customer","expected_daily_customers","monthly_fixed_costs"],"max_question_score":49}', 0.92, 54),
    ('revenue_model_warning', 'offline_daily_revenue_unclear_warning', 'Daily revenue model needs refinement', 'The unit economics may work, but the daily revenue picture is still too soft.', '{"question_codes_any":["average_price_per_customer","expected_daily_customers","monthly_fixed_costs"],"min_question_score":50,"max_question_score":79}', 0.74, 84),
    ('execution_focus_gap', 'offline_break_even_risk', 'Break-even risk is too high', 'Fixed costs, staffing readiness, or service flow may put the location under operational pressure.', '{"question_codes_any":["monthly_fixed_costs","staffing_readiness","turnover_rate"],"max_question_score":49}', 0.90, 34),
    ('execution_focus_warning', 'offline_break_even_risk_warning', 'Break-even assumptions need work', 'The operating model looks possible, but labor and fixed-cost assumptions need more discipline.', '{"question_codes_any":["monthly_fixed_costs","staffing_readiness","turnover_rate"],"min_question_score":50,"max_question_score":79}', 0.71, 64)
) as seeded(issue_key, cause_key, title, description, match_rule, confidence_weight, sort_order)
  on seeded.issue_key = did.issue_key
on conflict (issue_definition_id, cause_key) do update
set title = excluded.title,
    description = excluded.description,
    match_rule = excluded.match_rule,
    confidence_weight = excluded.confidence_weight,
    sort_order = excluded.sort_order,
    is_active = true;

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
select
  seeded.cause_key,
  seeded.recommendation_type,
  seeded.title,
  seeded.description,
  seeded.rationale,
  seeded.priority,
  seeded.expected_impact,
  seeded.effort_level,
  seeded.sort_order
from (
  values
    ('offline_local_competition_pressure', 'market', 'Run local competitor research', 'Visit or review nearby competitors, compare offer, price, positioning, and customer flow, then define one sharper wedge.', 'Offline market confidence improves when the local competitive field is concrete rather than assumed.', 'high', 'Sharper location strategy and better market entry focus.', 'medium', 45),
    ('offline_local_competition_pressure_warning', 'market', 'Run local competitor research', 'Visit or review nearby competitors, compare offer, price, positioning, and customer flow, then define one sharper wedge.', 'This tightens a moderate local market thesis before launch decisions harden.', 'medium', 'Better local market confidence and sharper positioning.', 'low', 75),
    ('offline_foot_traffic_uncertain', 'validation', 'Validate foot traffic at the target location', 'Count passersby or target visitors across different days and time blocks, then compare the observed flow with your demand assumptions.', 'Offline demand needs direct location evidence, not just intuition.', 'high', 'Clearer demand confidence and better site decisions.', 'medium', 15),
    ('offline_foot_traffic_uncertain_warning', 'validation', 'Validate foot traffic at the target location', 'Count passersby or target visitors across different days and time blocks, then compare the observed flow with your demand assumptions.', 'This converts moderate location confidence into usable evidence.', 'medium', 'Stronger foot-traffic evidence and better planning.', 'low', 45),
    ('offline_daily_revenue_unclear', 'revenue', 'Build a daily revenue simulation', 'Model daily revenue using average price, expected customers, and operating days, then compare it against fixed costs.', 'Offline revenue readiness improves when daily economics are made explicit.', 'high', 'Better unit economics visibility and clearer revenue targets.', 'medium', 55),
    ('offline_daily_revenue_unclear_warning', 'revenue', 'Build a daily revenue simulation', 'Model daily revenue using average price, expected customers, and operating days, then compare it against fixed costs.', 'This turns moderate revenue confidence into a more defensible business case.', 'medium', 'Clearer revenue assumptions and decision quality.', 'low', 85),
    ('offline_break_even_risk', 'execution', 'Run a rent and labor break-even check', 'Estimate the minimum daily sales needed to cover rent, baseline labor, and fixed costs, then reduce scope or costs if needed.', 'Break-even pressure is one of the fastest ways an offline business loses momentum.', 'high', 'More realistic operating plan and lower execution risk.', 'medium', 35),
    ('offline_break_even_risk_warning', 'execution', 'Run a rent and labor break-even check', 'Estimate the minimum daily sales needed to cover rent, baseline labor, and fixed costs, then reduce scope or costs if needed.', 'This helps validate whether the location economics are strong enough before scaling commitments.', 'medium', 'Tighter cost discipline and better launch readiness.', 'low', 65)
) as seeded(
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
where not exists (
  select 1
  from public.diagnosis_action_templates dat
  where dat.cause_key = seeded.cause_key
    and dat.title = seeded.title
);

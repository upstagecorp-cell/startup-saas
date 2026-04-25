alter table public.diagnosis_questions
add column if not exists help_text text;

insert into public.diagnosis_templates (
  code,
  name,
  version,
  description,
  is_active
)
values (
  'founder_diagnosis',
  'Founder Diagnosis',
  1,
  'Rule-based founder startup diagnosis template.',
  true
)
on conflict (code) do nothing;

with founder_template as (
  select id
  from public.diagnosis_templates
  where code = 'founder_diagnosis'
),
section_seed as (
  select *
  from (
    values
      ('customer', 'Customer', 'Customer understanding and segment clarity.', 10),
      ('problem', 'Problem', 'Problem urgency and validation depth.', 20),
      ('solution', 'Solution', 'Solution definition and readiness.', 30),
      ('market', 'Market', 'Market focus, category context, and channel readiness.', 40),
      ('revenue', 'Revenue', 'Revenue traction and monetization readiness.', 50),
      ('execution', 'Execution', 'Founder capacity, capital, and execution rhythm.', 60)
  ) as seeded(key, title, description, sort_order)
)
insert into public.diagnosis_template_sections (
  template_id,
  key,
  title,
  description,
  sort_order
)
select
  founder_template.id,
  section_seed.key,
  section_seed.title,
  section_seed.description,
  section_seed.sort_order
from founder_template
cross join section_seed
on conflict (template_id, key) do update
set title = excluded.title,
    description = excluded.description,
    sort_order = excluded.sort_order;

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
        'market',
        'industry_category_context',
        'What industry or category is your startup focused on?',
        'Use a short label such as fintech, B2B SaaS, healthcare, or creator tools.',
        'short_text',
        '{}'::jsonb,
        0.50::numeric,
        true,
        110
      ),
      (
        'revenue',
        'target_monthly_revenue_context',
        'What monthly revenue target are you currently aiming for?',
        'This answer is used as context only and should reflect your current milestone target.',
        'short_text',
        '{}'::jsonb,
        0.50::numeric,
        true,
        120
      ),
      (
        'market',
        'founder_industry_knowledge',
        'How strong is the founder''s firsthand industry knowledge?',
        'Rate this from 1 (very limited) to 5 (deep domain knowledge and network).',
        'scale',
        '{"min":1,"max":5,"step":1}'::jsonb,
        1.20::numeric,
        true,
        130
      ),
      (
        'execution',
        'founder_execution_time_band',
        'How much founder execution time is available each week?',
        'Choose the closest realistic weekly time commitment.',
        'single_choice',
        '{"options":[{"value":"under_5","label":"Under 5 hours","score":15},{"value":"5_to_10","label":"5 to 10 hours","score":40},{"value":"10_to_20","label":"10 to 20 hours","score":70},{"value":"20_plus","label":"20+ hours","score":100}]}'::jsonb,
        1.20::numeric,
        true,
        140
      ),
      (
        'customer',
        'customer_clarity',
        'How clearly can you describe the first target customer?',
        'Rate clarity from 1 (very broad guess) to 5 (clear ICP, buyer, and use case).',
        'scale',
        '{"min":1,"max":5,"step":1}'::jsonb,
        1.30::numeric,
        true,
        150
      ),
      (
        'problem',
        'problem_urgency',
        'How urgent is the customer problem you are solving?',
        'Rate urgency from 1 (nice to have) to 5 (must solve now).',
        'scale',
        '{"min":1,"max":5,"step":1}'::jsonb,
        1.30::numeric,
        true,
        160
      ),
      (
        'solution',
        'solution_readiness',
        'How ready is your current solution for real customer use?',
        'Rate readiness from 1 (concept only) to 5 (usable and testable right now).',
        'scale',
        '{"min":1,"max":5,"step":1}'::jsonb,
        1.25::numeric,
        true,
        170
      ),
      (
        'market',
        'sales_channel_readiness',
        'How ready is your first sales or acquisition channel?',
        'Rate this from 1 (unclear channel) to 5 (repeatable first channel already in use).',
        'scale',
        '{"min":1,"max":5,"step":1}'::jsonb,
        1.15::numeric,
        true,
        180
      ),
      (
        'revenue',
        'current_monthly_revenue_band',
        'What is your current monthly revenue level?',
        'Choose the closest current revenue band.',
        'single_choice',
        '{"options":[{"value":"none","label":"No revenue yet","score":0},{"value":"under_1k","label":"Under 1K","score":25},{"value":"1k_to_5k","label":"1K to 5K","score":50},{"value":"5k_to_20k","label":"5K to 20K","score":75},{"value":"20k_plus","label":"20K+","score":100}]}'::jsonb,
        1.25::numeric,
        true,
        190
      ),
      (
        'execution',
        'available_capital_band',
        'How much available capital can you realistically deploy now?',
        'Choose the closest available capital band for the next execution phase.',
        'single_choice',
        '{"options":[{"value":"under_1k","label":"Under 1K","score":20},{"value":"1k_to_5k","label":"1K to 5K","score":45},{"value":"5k_to_20k","label":"5K to 20K","score":70},{"value":"20k_plus","label":"20K+","score":100}]}'::jsonb,
        1.10::numeric,
        true,
        200
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
    ('problem_validation_gap', 'problem_urgency_low', 'Problem urgency is too low', 'The customer problem may not be painful enough to trigger real buying behavior.', '{"question_codes_any":["problem_urgency"],"max_question_score":49}', 0.92, 11),
    ('problem_validation_warning', 'problem_urgency_moderate', 'Problem urgency needs stronger proof', 'The problem looks relevant, but urgency signals are not strong enough yet.', '{"question_codes_any":["problem_urgency"],"min_question_score":50,"max_question_score":79}', 0.74, 41),
    ('customer_clarity_gap', 'customer_definition_unclear', 'Customer definition is unclear', 'The team likely needs a sharper definition of the first target customer.', '{"question_codes_any":["customer_clarity"],"max_question_score":49}', 0.91, 21),
    ('customer_clarity_warning', 'customer_definition_moderate', 'Customer definition needs refinement', 'The target customer is partly known, but not clearly enough to guide execution.', '{"question_codes_any":["customer_clarity"],"min_question_score":50,"max_question_score":79}', 0.72, 51),
    ('solution_fit_gap', 'solution_not_ready', 'Solution is not ready enough', 'The current solution may still be too early to test with real users consistently.', '{"question_codes_any":["solution_readiness"],"max_question_score":49}', 0.90, 31),
    ('solution_fit_warning', 'solution_needs_iteration', 'Solution needs sharper iteration', 'The solution has direction, but it still needs better scope and usability.', '{"question_codes_any":["solution_readiness"],"min_question_score":50,"max_question_score":79}', 0.71, 61),
    ('market_focus_gap', 'channel_not_ready', 'First channel is not ready', 'The startup may not yet have a believable first channel to reach early customers.', '{"question_codes_any":["sales_channel_readiness","founder_industry_knowledge"],"max_question_score":49}', 0.88, 41),
    ('market_focus_warning', 'channel_learning_needed', 'Channel readiness needs improvement', 'The initial market channel exists in theory, but still needs stronger proof.', '{"question_codes_any":["sales_channel_readiness","founder_industry_knowledge"],"min_question_score":50,"max_question_score":79}', 0.69, 71),
    ('revenue_model_gap', 'revenue_traction_low', 'Revenue traction is too low', 'The business still lacks enough revenue evidence to support its monetization path.', '{"question_codes_any":["current_monthly_revenue_band"],"max_question_score":39}', 0.93, 51),
    ('revenue_model_warning', 'revenue_traction_early', 'Revenue traction is still early', 'Some revenue signal exists, but it is not strong or repeatable enough yet.', '{"question_codes_any":["current_monthly_revenue_band"],"min_question_score":40,"max_question_score":79}', 0.73, 81),
    ('execution_focus_gap', 'execution_capacity_low', 'Execution capacity is too constrained', 'Time or capital constraints are likely slowing focused execution.', '{"question_codes_any":["founder_execution_time_band","available_capital_band"],"max_question_score":49}', 0.89, 31),
    ('execution_focus_warning', 'execution_capacity_moderate', 'Execution capacity needs strengthening', 'The startup has some execution capacity, but still needs more time or capital discipline.', '{"question_codes_any":["founder_execution_time_band","available_capital_band"],"min_question_score":50,"max_question_score":79}', 0.70, 61)
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
    ('problem_urgency_low', 'problem', 'Refine the problem around urgent pain', 'Rework the problem statement around a user pain that creates immediate action or loss.', 'Weak urgency usually means the problem is not painful enough yet to drive adoption.', 'high', 'Stronger problem-market pull and better customer response.', 'medium', 12),
    ('problem_urgency_moderate', 'problem', 'Validate urgency with stronger evidence', 'Ask recent prospects what happens if they do nothing and document the real cost of delay.', 'This sharpens moderate urgency into clearer buying intent signals.', 'medium', 'Better confidence in the problem''s urgency.', 'low', 42),
    ('customer_definition_unclear', 'customer', 'Rewrite the first customer profile', 'Define one target customer with one buyer, one use case, and one painful job to be done.', 'A sharper customer profile improves discovery, positioning, and execution speed.', 'high', 'Clearer ICP and more focused outreach.', 'low', 22),
    ('customer_definition_moderate', 'customer', 'Tighten the customer definition', 'Review past conversations and reduce the target segment to the clearest early adopter pattern.', 'Moderate customer clarity improves when the segment becomes narrower and more specific.', 'medium', 'Better targeting and more useful feedback loops.', 'low', 52),
    ('solution_not_ready', 'solution', 'Define the smallest testable solution', 'Cut the solution down to the minimum version that a real customer can try now.', 'Low readiness usually improves through narrower scope, not more features.', 'high', 'Faster testing and clearer solution learning.', 'medium', 32),
    ('solution_needs_iteration', 'solution', 'Strengthen solution usability and scope', 'Remove non-core features and tighten the current solution around one main outcome.', 'This turns a promising solution into something easier to validate repeatedly.', 'medium', 'Better product clarity and user response quality.', 'low', 62),
    ('channel_not_ready', 'market', 'Choose and test one acquisition channel', 'List one realistic first channel and run a small test with a narrow customer segment.', 'Channel uncertainty slows market learning and makes demand harder to validate.', 'high', 'Clearer go-to-market path and better market focus.', 'medium', 43),
    ('channel_learning_needed', 'market', 'Improve channel learning discipline', 'Track outreach, response, and conversion signals for one initial channel for two weeks.', 'Structured channel learning helps convert moderate market confidence into repeatable traction.', 'medium', 'Better channel confidence and cleaner market signals.', 'low', 72),
    ('revenue_traction_low', 'revenue', 'Run direct willingness-to-pay checks', 'Ask for price reactions or simple pre-commitments from target customers this week.', 'Low revenue traction needs direct monetization evidence, not abstract pricing theory.', 'high', 'Stronger revenue evidence and better pricing decisions.', 'medium', 52),
    ('revenue_traction_early', 'revenue', 'Track repeatable revenue signals', 'Create a lightweight weekly log for revenue, objections, and repeat purchase intent.', 'This helps early revenue become a repeatable operating signal.', 'medium', 'Better monetization visibility and readiness.', 'low', 82),
    ('execution_capacity_low', 'execution', 'Reduce scope to fit available capacity', 'Cut current work down to one priority that matches the founder''s actual time and capital limits.', 'Execution breaks when the operating plan assumes more resources than are available.', 'high', 'More realistic delivery pace and fewer dropped priorities.', 'low', 32),
    ('execution_capacity_moderate', 'execution', 'Tighten weekly execution capacity planning', 'Review the next two weeks of work and remove tasks that do not fit current time or budget.', 'Moderate execution capacity improves when planning matches real constraints.', 'medium', 'Higher completion rate and better focus.', 'low', 62)
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

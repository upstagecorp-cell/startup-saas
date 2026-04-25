alter table public.diagnosis_questions
add column if not exists help_text text;

with founder_template as (
  select id
  from public.diagnosis_templates
  where code = 'founder_diagnosis'
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
  founder_template.id,
  null,
  'business_type',
  'Is your business primarily online or offline?',
  'Choose the business type first. This answer is used for branching only and does not affect scoring.',
  'single_choice',
  '{
    "scoring_excluded": true,
    "business_types": ["online", "offline"],
    "options": [
      { "value": "online", "label": "Online", "score": 0 },
      { "value": "offline", "label": "Offline", "score": 0 }
    ]
  }'::jsonb,
  0.10,
  0,
  true,
  true
from founder_template
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

-- Encoding and mojibake audit for Supabase SQL Editor.
-- This file does not change schema or data.

select
  current_setting('server_encoding') as server_encoding,
  current_setting('client_encoding') as client_encoding,
  pg_encoding_to_char(encoding) as database_encoding
from pg_database
where datname = current_database();

-- The pattern below catches common Korean mojibake markers seen in the app source.
-- Review rows before updating any production data.
with suspicious_pattern as (
  select '(�|吏|濡|쒓|뚯|썝|媛||鍮|꾨|踰|덊|샇|섍|꼍|蹂|뺤|씤|二쇱꽭|遺|덈|윭|몄|뀡|앹|꽦|듬|땲)'::text as pattern
)
select 'diagnosis_templates' as table_name, id::text as row_id, name as field_value
from public.diagnosis_templates, suspicious_pattern
where name ~ pattern
union all
select 'diagnosis_template_sections', id::text, title
from public.diagnosis_template_sections, suspicious_pattern
where title ~ pattern
union all
select 'diagnosis_questions.question_text', id::text, question_text
from public.diagnosis_questions, suspicious_pattern
where question_text ~ pattern
union all
select 'diagnosis_questions.help_text', id::text, help_text
from public.diagnosis_questions, suspicious_pattern
where help_text ~ pattern
union all
select 'diagnosis_results.summary', id::text, summary
from public.diagnosis_results, suspicious_pattern
where summary ~ pattern
union all
select 'diagnosis_results.recommended_next_step', id::text, recommended_next_step
from public.diagnosis_results, suspicious_pattern
where recommended_next_step ~ pattern
union all
select 'diagnosis_result_dimensions.dimension_name', id::text, dimension_name
from public.diagnosis_result_dimensions, suspicious_pattern
where dimension_name ~ pattern
union all
select 'diagnosis_result_dimensions.summary', id::text, summary
from public.diagnosis_result_dimensions, suspicious_pattern
where summary ~ pattern
union all
select 'diagnosis_result_issues.title', id::text, title
from public.diagnosis_result_issues, suspicious_pattern
where title ~ pattern
union all
select 'diagnosis_result_issues.description', id::text, description
from public.diagnosis_result_issues, suspicious_pattern
where description ~ pattern
union all
select 'action_recommendations.title', id::text, title
from public.action_recommendations, suspicious_pattern
where title ~ pattern
union all
select 'action_recommendations.description', id::text, description
from public.action_recommendations, suspicious_pattern
where description ~ pattern
union all
select 'result_actions.title', id::text, title
from public.result_actions, suspicious_pattern
where title ~ pattern
union all
select 'result_actions.description', id::text, description
from public.result_actions, suspicious_pattern
where description ~ pattern
union all
select 'result_actions.note', id::text, note
from public.result_actions, suspicious_pattern
where note ~ pattern
order by table_name, row_id;

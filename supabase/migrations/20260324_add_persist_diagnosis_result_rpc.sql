create or replace function public.persist_diagnosis_result(
  p_session_id uuid,
  p_user_id uuid,
  p_overall_score numeric,
  p_risk_level text,
  p_recommended_next_step text,
  p_summary text,
  p_answer_scores jsonb,
  p_dimension_rows jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_session_id uuid;
  v_result_id uuid;
begin
  select ds.id
    into v_session_id
  from public.diagnosis_sessions ds
  where ds.id = p_session_id
    and ds.user_id = p_user_id;

  if v_session_id is null then
    raise exception 'Diagnosis session not found for session_id=% and user_id=%', p_session_id, p_user_id;
  end if;

  update public.diagnosis_answers da
  set score = payload.score
  from jsonb_to_recordset(coalesce(p_answer_scores, '[]'::jsonb)) as payload(question_id uuid, score numeric)
  where da.session_id = p_session_id
    and da.user_id = p_user_id
    and da.question_id = payload.question_id;

  update public.diagnosis_sessions
  set overall_score = p_overall_score,
      summary = p_summary
  where id = p_session_id
    and user_id = p_user_id;

  insert into public.diagnosis_results (
    session_id,
    user_id,
    result_version,
    overall_score,
    risk_level,
    recommended_next_step
  )
  values (
    p_session_id,
    p_user_id,
    1,
    p_overall_score,
    p_risk_level,
    p_recommended_next_step
  )
  on conflict (session_id) do update
  set result_version = public.diagnosis_results.result_version,
      overall_score = excluded.overall_score,
      risk_level = excluded.risk_level,
      recommended_next_step = excluded.recommended_next_step
  returning id into v_result_id;

  delete from public.diagnosis_result_dimensions
  where result_id = v_result_id;

  insert into public.diagnosis_result_dimensions (
    result_id,
    dimension_key,
    dimension_name,
    score,
    benchmark_score,
    status,
    summary,
    sort_order
  )
  select
    v_result_id,
    payload.dimension_key,
    payload.dimension_name,
    payload.score,
    payload.benchmark_score,
    payload.status,
    payload.summary,
    payload.sort_order
  from jsonb_to_recordset(coalesce(p_dimension_rows, '[]'::jsonb)) as payload(
    dimension_key text,
    dimension_name text,
    score numeric,
    benchmark_score numeric,
    status text,
    summary text,
    sort_order integer
  );

  return v_result_id;
end;
$$;

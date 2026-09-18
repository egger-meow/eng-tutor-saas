begin;

do $$
declare
  configured_limit integer;
  normal_definition text;
  week1_definition text;
begin
  select integer_value
  into configured_limit
  from public.operational_settings
  where key = 'authoring_batch_limit';

  if configured_limit is null or configured_limit < 1 then
    raise exception 'authoring_batch_limit must be configured to a positive value';
  end if;

  if exists (select 1 from public.operational_settings where key = 'daily_generation_limit') then
    raise exception 'legacy daily_generation_limit must not remain as a second batch-size authority';
  end if;

  normal_definition := pg_get_functiondef('private_generation.claim_due_generation_jobs(text)'::regprocedure);
  if normal_definition not like '%authoring_batch_limit%'
     or normal_definition not like '%limit claim_limit%normal as materialized%' then
    raise exception 'normal authoring claim is not governed by authoring_batch_limit';
  end if;

  week1_definition := pg_get_functiondef('private_generation.claim_week1_fast_generation_jobs(text)'::regprocedure);
  if week1_definition not like '%authoring_batch_limit%'
     or week1_definition not like '%limit claim_limit%' then
    raise exception 'Week 1 claim is not governed by authoring_batch_limit';
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'generation_jobs_require_feedback_request' and not tgisinternal
  ) then raise exception 'feedback request generation guard is missing'; end if;

  if has_function_privilege('anon', 'public.submit_feedback_and_request_next_material(uuid,uuid,smallint,integer,text,text,text,text)', 'execute') then
    raise exception 'anonymous role must not request materials';
  end if;
end
$$;

rollback;

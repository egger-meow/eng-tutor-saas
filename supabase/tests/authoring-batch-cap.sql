begin;

do $$
declare normal_definition text; week1_definition text;
begin
  if (select integer_value from public.operational_settings where key = 'daily_generation_limit') <> 10 then
    raise exception 'authoring batch setting must be 10';
  end if;

  normal_definition := pg_get_functiondef('private_generation.claim_due_generation_jobs(text)'::regprocedure);
  if normal_definition not like '%limit claim_limit%normal as materialized%' then
    raise exception 'mandatory claim candidates are not capped before update';
  end if;

  week1_definition := pg_get_functiondef('private_generation.claim_week1_fast_generation_jobs(text)'::regprocedure);
  if week1_definition not like '%limit 10%' then
    raise exception 'Week 1 claim is not capped at 10';
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

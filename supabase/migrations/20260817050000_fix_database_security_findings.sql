-- Fix security findings: Enable RLS on canonical reference tables and secure search_path on functions

-- 1. Enable RLS on canonical curriculum reference tables and allow public read
alter table if exists public.canonical_curriculum_vocabulary enable row level security;
drop policy if exists "Allow read canonical_curriculum_vocabulary" on public.canonical_curriculum_vocabulary;
create policy "Allow read canonical_curriculum_vocabulary" on public.canonical_curriculum_vocabulary for select using (true);

alter table if exists public.canonical_grammar_units enable row level security;
drop policy if exists "Allow read canonical_grammar_units" on public.canonical_grammar_units;
create policy "Allow read canonical_grammar_units" on public.canonical_grammar_units for select using (true);

alter table if exists public.canonical_communication_functions enable row level security;
drop policy if exists "Allow read canonical_communication_functions" on public.canonical_communication_functions;
create policy "Allow read canonical_communication_functions" on public.canonical_communication_functions for select using (true);

-- 2. Fix mutable search_path on grade_stage_rank
create or replace function public.grade_stage_rank(stage text)
returns integer
language sql immutable
set search_path = ''
as $$
  select case lower(coalesce(stage, ''))
    when 'grade_7' then 7
    when '7' then 7
    when 'grade_8' then 8
    when '8' then 8
    when 'grade_9' then 9
    when '9' then 9
    else 7
  end;
$$;

revoke all on function public.grade_stage_rank(text) from public;
grant execute on function public.grade_stage_rank(text) to authenticated, service_role, anon;

-- 3. Hardened get_enrollment_state definition
create or replace function public.get_enrollment_state()
returns table (status text, capacity integer, active_count integer, remaining integer, founding_limit integer, founding_count integer)
language sql stable security definer
set search_path = ''
as $$
  select settings.status, settings.capacity,
    count(child.id)::integer,
    greatest(settings.capacity - count(child.id)::integer, 0),
    settings.founding_limit,
    count(child.id) filter (where subscription.founding_status in ('eligible', 'redeemed'))::integer
  from public.enrollment_settings as settings
  left join public.subscriptions as subscription on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children as child on child.id = subscription.child_id and child.is_active
  where settings.key = 'default'
  group by settings.status, settings.capacity, settings.founding_limit;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;

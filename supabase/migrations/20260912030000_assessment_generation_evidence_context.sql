-- ============================================================================
-- Direct Assessment Phase 6: Generation Context & Snapshot Boundary Integration
-- Forward-only migration:
-- 1. Updates public.worker_generation_context to snapshot and serialize compact assessment evidence
-- 2. Respects immutable claim snapshot boundary (v_cutoff resolved from snapshot or now())
-- 3. Filters child_assessment_state by assessed_at <= v_cutoff
-- 4. Computes ageDays and freshness (fresh <= 90d, aging 91-180d, stale > 180d)
-- 5. Extracts compact bounded skills (max 8) and all 3 domains
-- 6. Omits assessmentEvidence when no completed assessment exists before cutoff
-- ============================================================================

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  base jsonb;
  child_value uuid;
  lifetime jsonb;
  v_format_memory jsonb;
  v_recent_forms jsonb;
  v_recent_delivery_memory jsonb;
  v_existing_cutoff timestamptz;
  v_cutoff timestamptz := now();
  v_assessment_state public.child_assessment_state%rowtype;
  v_age_days integer;
  v_freshness text;
  v_domains jsonb;
  v_compact_skills jsonb := '{}'::jsonb;
  v_assessment_capsule jsonb := null;
begin
  base := public.worker_generation_context_before_student_library(job_id, worker_id);
  select child_id into child_value from public.generation_jobs where id = worker_generation_context.job_id;

  -- 1. Resolve immutable cutoff timestamp from existing claim snapshot if already claimed
  select coalesce(
    (snapshot.generation_context->>'cutoffTimestamp')::timestamptz,
    snapshot.claimed_at
  ) into v_existing_cutoff
  from private_generation.generation_claim_snapshots as snapshot
  where snapshot.job_id = worker_generation_context.job_id;

  if v_existing_cutoff is not null then
    v_cutoff := v_existing_cutoff;
  end if;

  -- 2. Lifetime learning memory
  select jsonb_build_object(
    'vocabulary', jsonb_build_object(
      'total', count(*),
      'dueTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where review_due), '[]'::jsonb),
      'verifiedWeakTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason is not null), '[]'::jsonb),
      'uncertainTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status in ('new', 'learning')), '[]'::jsonb),
      'masteredTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status = 'mastered'), '[]'::jsonb),
      'regressionTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)
    ),
    'grammar', (
      select jsonb_build_object(
        'total', count(*),
        'dueTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where review_due), '[]'::jsonb),
        'verifiedWeakTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason is not null), '[]'::jsonb),
        'uncertainTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status in ('new', 'learning')), '[]'::jsonb),
        'masteredTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status = 'mastered'), '[]'::jsonb),
        'regressionTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)
      )
      from public.child_grammar_progress
      where child_id = child_value
    ),
    'communication', (
      select jsonb_build_object(
        'total', count(*),
        'dueTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where review_due), '[]'::jsonb),
        'verifiedWeakTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason is not null), '[]'::jsonb),
        'uncertainTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status in ('new', 'learning')), '[]'::jsonb),
        'masteredTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status = 'mastered'), '[]'::jsonb),
        'regressionTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)
      )
      from public.child_communication_progress
      where child_id = child_value
    )
  ) into lifetime from public.child_vocab_progress where child_id = child_value;

  -- 3. Canonical format memory extraction
  v_format_memory := public.aggregate_format_memory(child_value, 4);
  v_recent_delivery_memory := coalesce(v_format_memory -> 'recentDeliveryMemory', '[]'::jsonb);
  v_recent_forms := coalesce(v_format_memory -> 'recentResponseForms', '[]'::jsonb);

  if base ? 'diversityCapsule' then
    base := jsonb_set(base, '{diversityCapsule,recentResponseForms}', v_recent_forms, true);
    base := jsonb_set(base, '{diversityCapsule,recentDeliveryMemory}', v_recent_delivery_memory, true);
  end if;

  -- 4. Compact Direct Assessment evidence lookup (snapshot-bound: assessed_at <= v_cutoff)
  select * into v_assessment_state
  from public.child_assessment_state
  where child_id = child_value
    and status = 'completed'
    and assessed_at <= v_cutoff;

  if v_assessment_state.child_id is not null then
    v_age_days := greatest(0, floor(extract(epoch from (v_cutoff - v_assessment_state.assessed_at)) / 86400)::integer);
    v_freshness := case
      when v_age_days <= 90 then 'fresh'
      when v_age_days <= 180 then 'aging'
      else 'stale'
    end;

    v_domains := coalesce(v_assessment_state.domain_summaries, '{}'::jsonb);

    -- Extract compact bounded skills (needs_support, developing with medium/high confidence, or stretch secure)
    select coalesce(
      jsonb_object_agg(
        sub.skill_key,
        jsonb_build_object(
          'level', sub.skill_level,
          'confidence', sub.skill_confidence
        )
      ),
      '{}'::jsonb
    )
    into v_compact_skills
    from (
      select
        s.key as skill_key,
        s.value->>'level' as skill_level,
        s.value->>'confidence' as skill_confidence
      from jsonb_each(coalesce(v_assessment_state.skill_results, '{}'::jsonb)) as s
      where s.value->>'level' = 'needs_support'
         or (s.value->>'level' = 'developing' and s.value->>'confidence' in ('medium', 'high'))
         or (
           s.value->>'level' = 'secure'
           and s.value->>'confidence' = 'high'
           and (
             v_domains->(
               case
                 when s.key in ('core_vocabulary', 'contextual_meaning', 'word_form_usage') then 'vocabulary'
                 when s.key in ('explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration') then 'reading'
                 else 'grammar'
               end
             )->>'level'
           ) != 'secure'
         )
      order by
        case when s.value->>'level' = 'needs_support' then 1 when s.value->>'level' = 'developing' then 2 else 3 end,
        case when s.value->>'confidence' = 'high' then 1 when s.value->>'confidence' = 'medium' then 2 else 3 end,
        s.key asc
      limit 8
    ) as sub;

    v_assessment_capsule := jsonb_build_object(
      'projectionVersion', v_assessment_state.projection_version,
      'assessedAt', v_assessment_state.assessed_at,
      'freshness', v_freshness,
      'ageDays', v_age_days,
      'skills', v_compact_skills,
      'domains', v_domains
    );
  end if;

  -- 5. Construct generation context output
  if v_assessment_capsule is not null then
    return base || jsonb_build_object(
      'lifetimeLearningMemory', lifetime,
      'targetedOlderEvidence', '[]'::jsonb,
      'cutoffTimestamp', v_cutoff,
      'claimSnapshotId', job_id,
      'recentDeliveryMemory', v_recent_delivery_memory,
      'memoryPolicyVersion', 'two-stage-v1',
      'assessmentEvidence', v_assessment_capsule
    );
  else
    return base || jsonb_build_object(
      'lifetimeLearningMemory', lifetime,
      'targetedOlderEvidence', '[]'::jsonb,
      'cutoffTimestamp', v_cutoff,
      'claimSnapshotId', job_id,
      'recentDeliveryMemory', v_recent_delivery_memory,
      'memoryPolicyVersion', 'two-stage-v1'
    );
  end if;
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;

comment on function public.worker_generation_context(uuid, text)
is 'Produces authoritative generation context for a claimed job, including lifetime memory, format memory, and snapshot-bound compact Direct Assessment evidence.';

-- Forward-only migration: Harden direct assessment integrity boundaries
-- 1. Enforce domain <-> skill consistency check constraint
-- 2. Revoke direct authenticated access to assessment_items (hide answer keys)
-- 3. Expose assessment_client_items view (question rendering projection without grading secrets)
-- 4. Revoke direct authenticated mutation privileges on assessment_sessions, assessment_responses, child_assessment_state

-- 1. Domain <-> Skill consistency
alter table public.assessment_items
  add constraint assessment_items_domain_skill_check
  check (
    (domain = 'vocabulary' and skill in ('core_vocabulary', 'contextual_meaning', 'word_form_usage')) or
    (domain = 'grammar' and skill in ('basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures')) or
    (domain = 'reading' and skill in ('explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'))
  );

-- 2. Revoke direct authenticated select on base assessment_items
drop policy if exists assessment_items_authenticated_select on public.assessment_items;
revoke select on public.assessment_items from authenticated;

-- 3. Create client question projection view (no grading secrets)
create or replace view public.assessment_client_items with (security_invoker = false) as
select
  id,
  response_type,
  passage_id,
  prompt,
  choices
from public.assessment_items
where status = 'active';

grant select on public.assessment_client_items to authenticated;

-- 4. Revoke direct authenticated mutation privileges on authoritative diagnostic state
-- Drop mutative policies
drop policy if exists assessment_sessions_owner_insert on public.assessment_sessions;
drop policy if exists assessment_sessions_owner_update on public.assessment_sessions;
drop policy if exists assessment_responses_owner_insert on public.assessment_responses;
drop policy if exists child_assessment_state_owner_insert on public.child_assessment_state;
drop policy if exists child_assessment_state_owner_update on public.child_assessment_state;

-- Revoke mutation grants
revoke insert, update, delete on public.assessment_sessions from authenticated;
revoke insert, update, delete on public.assessment_responses from authenticated;
revoke insert, update, delete on public.child_assessment_state from authenticated;

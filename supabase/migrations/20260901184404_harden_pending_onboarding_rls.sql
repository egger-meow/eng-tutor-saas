-- Defense-in-depth for the pre-auth onboarding handoff table.
-- The table is not exposed to anon/authenticated directly; RLS adds the same deny-by-default
-- posture used by every other private_generation table.

alter table if exists private_generation.pending_onboardings enable row level security;

-- Enable Row Level Security on internal private_generation tables for defense-in-depth hardening
-- and to eliminate Supabase Security Advisor critical warnings.
-- These tables have no anon/authenticated grants and are accessed only via security-definer RPCs
-- or service_role. Enabling RLS defaults all non-superuser access to DENY ALL.

alter table if exists private_generation.production_operational_settings enable row level security;
alter table if exists private_generation.capacity_checkout_claims enable row level security;
alter table if exists private_generation.checkout_capacity_reservations enable row level security;
alter table if exists private_generation.founder_redemptions enable row level security;
alter table if exists private_generation.founder_checkout_claims enable row level security;
alter table if exists private_generation.generation_claim_snapshots enable row level security;
alter table if exists private_generation.curriculum_submissions enable row level security;

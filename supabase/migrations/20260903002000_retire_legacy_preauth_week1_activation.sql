-- Retire the legacy browser-side pending-onboarding creation entry after the trusted
-- start-landing-onboarding Edge Function becomes the public orchestration surface.
-- This migration is intentionally separate from the core lifecycle migration so production
-- rollout can keep the old web build working until the new Edge/web path is deployed.

revoke all on function public.create_pending_onboarding(text, jsonb, text, text)
from public, anon, authenticated;
revoke all on function public.create_pending_onboarding(text, jsonb, text, text)
from service_role;

revoke all on table private_generation.pending_onboardings from public, anon, authenticated;

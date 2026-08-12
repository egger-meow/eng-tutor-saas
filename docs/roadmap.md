# Delivery Roadmap

## Foundation

- Rebuild the specification into focused contracts.
- Initialize the pnpm/React/Vite workspace and CI.
- Establish secure Supabase schema, RLS, private Storage, and queue semantics.
- Define generator and PDF interfaces without pretending generation is live.

## Beta Build

- Implement parent authentication and child management.
- Implement subscription entitlement after validating the billing provider for Taiwan.
- Build material history, private downloads, feedback, and operator views.
- Implement deterministic packet validation and PDF rendering.
- Prove synthetic Week 1 → feedback → personalized Week 2.

## Scheduled Operations

- Provision staging and production Supabase projects.
- Complete a manual end-to-end generation run.
- Create the ChatGPT Work project with GitHub and Supabase access.
- Add the daily schedule from `docs/generation-workflow.md` with default limit `15`.
- Monitor backlog, failures, cost, quality, and turnaround before raising the 100-child beta cap.

## Launch

- Publish the learning-method guide and parent onboarding.
- Validate pricing, Week 1 free behavior, founding offer, refunds, and privacy terms.
- Pilot with a small family cohort, review packets manually, then expand gradually.

## Decisions Required Before Beta

- Billing provider and exact entitlement/webhook behavior in Taiwan.
- Final weekly delivery day and timezone rules.
- PDF renderer after testing Traditional Chinese fonts and A4 output.
- Retention and deletion periods for feedback, generation logs, and PDFs.

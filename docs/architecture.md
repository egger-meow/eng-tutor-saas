# Architecture

## System Boundaries

- `apps/web`: static React/TypeScript parent portal deployed to GitHub Pages.
- Supabase Auth: parent email OTP or magic-link sessions.
- Supabase PostgreSQL: ownership, subscriptions, feedback, materials, operational settings, and generation queue.
- Supabase Storage: private student and parent-answer PDFs.
- `packages/generator`: shared contracts and deterministic curriculum assembly rules.
- `packages/pdf`: PDF artifact and renderer boundaries.
- ChatGPT Work: future privileged daily worker. It is external to the deployed SPA.

## Trust Model

The browser uses a publishable key and is restricted by explicit Data API grants plus RLS. It never receives a secret/service-role key. The future worker uses separately managed privileged credentials and must follow `docs/generation-workflow.md`.

Parent ownership is the authorization root. A child references its parent profile; all subscriptions, feedback, materials, and jobs resolve through that child. Sibling records remain independent even under one parent.

## Deployment

GitHub Actions validates every change. The Pages workflow builds only the SPA. Supabase migrations are reviewed and applied through an authorized environment; CI must not contain production database secrets by default.

Vite's base path is configurable through `VITE_BASE_PATH` so project Pages (`/eng-tutor-saas/`) and custom-domain (`/`) deployments use the same build.

## Design Principles

- Favor explicit state and idempotent transitions.
- Version inputs that affect generated output.
- Keep completed artifacts immutable.
- Prefer operator-visible failure over silent retry loops.
- Build for the beta cap first; avoid distributed infrastructure until measured load requires it.

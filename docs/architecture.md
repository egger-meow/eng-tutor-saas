# Architecture

## System Boundaries

- `apps/web`: static React/TypeScript parent portal deployed with Cloudflare Workers Static Assets.
- Supabase Auth: parent email OTP or magic-link sessions.
- Supabase PostgreSQL: ownership, subscriptions, feedback, materials, operational settings, and generation queue.
- Supabase Storage: private student and parent-answer PDFs.
- `packages/generator`: shared contracts and deterministic curriculum assembly rules.
- `packages/pdf`: PDF artifact and renderer boundaries.
- Local Windows Codex runner: privileged daily curriculum author. It is external to the deployed SPA and hands immutable submissions to the GitHub Actions Finisher.

## Trust Model

The browser uses a publishable key and is restricted by explicit Data API grants plus RLS. It never receives a secret/service-role key. The future worker uses separately managed privileged credentials and must follow `docs/generation-workflow.md`.

Parent ownership is the authorization root. A child references its parent profile; all subscriptions, feedback, materials, and jobs resolve through that child. Sibling records remain independent even under one parent.

## Scoped Material Notification Boundary

The privileged worker dispatches release notifications through a small transactional-email provider boundary and PostgreSQL leases. Gmail SMTP is the current provider; a future provider adapter can be added without changing claims, retries, templates, tokens, release rules, or database state. A durable send-start marker prevents automatic resend when an interrupted SMTP transaction has an uncertain outcome; explicit failures remain retryable. Email is notification plus scoped convenience access; the Dashboard remains canonical authenticated material history.

One hashed, revocable, 90-day token resolves to one parent, child, and released material plus two 30-minute private PDF URLs. Scoped validity is independent of `sent_at`, closing the SMTP-accepted/database-acknowledgement crash window. The browser captures the raw token in tab-scoped `sessionStorage` before removing it from the visible URL, so refresh works without persisting access across browser sessions. It never grants a session, Dashboard, history, billing, profile, or feedback access. A matching existing parent session redirects to the canonical authenticated material area; a different account remains in scoped mode.

## Deployment

GitHub Actions validates every change. The Cloudflare Workers workflow builds and deploys only the SPA to `https://paperbond.jjmowlab.com`. Supabase migrations are reviewed and applied through an authorized environment; CI must not contain production database secrets by default.

Vite, application routes, assets, authentication callbacks, and release-email links are rooted at `/`. Workers Static Assets provides the SPA deep-link fallback through `wrangler.jsonc`; the build must not contain the former GitHub Pages `404.html` copy.

## Design Principles

- Favor explicit state and idempotent transitions.
- Version inputs that affect generated output.
- Keep completed artifacts immutable.
- Prefer operator-visible failure over silent retry loops.
- Build for the beta cap first; avoid distributed infrastructure until measured load requires it.

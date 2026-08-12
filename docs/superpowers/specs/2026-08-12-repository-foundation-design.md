# Repository Foundation Design

## Goal

Turn the specification-first folder into a maintainable repository that a future ChatGPT Work scheduled task can read and operate safely.

## Decisions

- Use a pnpm workspace with a React + TypeScript + Vite SPA in `apps/web`.
- Use Supabase for Auth, PostgreSQL, RLS, and private PDF Storage.
- Keep curriculum logic, prompts, and PDF concerns in focused repository modules.
- Keep GitHub Actions limited to CI and static deployment. It does not generate lessons or trigger ChatGPT Work.
- Create the ChatGPT Work schedule only after the repository and Supabase reach an operational milestone.
- The future daily worker reads due `generation_jobs`, claims at most the configured `daily_generation_limit` (default `15`), creates both PDFs, uploads them, and records the outcome. Excess jobs remain queued; operators can rerun failed or overdue work.
- Store operational limits in Supabase rather than hard-coding them in application code or prompts.
- Treat `egger-meow/eng-tutor` as research upstream only, with no runtime dependency.

## Documentation Shape

`docs/SPEC.md` becomes the concise product contract. Architecture, data ownership, generation operations, curriculum rules, upstream intake, and roadmap live in focused companion documents. Historical fragments are consolidated rather than copied forward verbatim.

## Safety Boundaries

The browser receives only the Supabase URL and publishable key. Worker secrets stay outside Git and outside Vite variables. Every exposed table uses explicit grants and RLS. PDFs remain in private buckets, and no real child data or generated private files enter Git.

## Acceptance

The repository has reproducible install, lint, test, type-check, and build commands; an initial secure migration; a documented worker contract; CI; and enough structure for later feature work without pretending that lesson generation is already automated.

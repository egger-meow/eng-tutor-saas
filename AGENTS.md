# Repository Guidelines

## Project Structure & Module Organization

Read `docs/SPEC.md` before changing product behavior. Use `apps/web/src/` for the parent portal, `packages/generator/` for curriculum contracts, `packages/pdf/` for rendering boundaries, `supabase/migrations/` for backend changes, and `.github/workflows/` for CI/deployment. Keep supporting decisions in focused files under `docs/`.

## Build, Test, and Development Commands

Use Node.js 24+ and pnpm 11+. Repository commands are:

```powershell
pnpm dev          # run the Vite parent portal
pnpm lint         # run Oxlint on the web app
pnpm test         # run Vitest across the workspace
pnpm test:db      # smoke-test the running local Supabase stack
pnpm typecheck    # type-check every package
pnpm build        # create production builds
```

## Coding Style & Naming Conventions

Use two-space indentation in TypeScript, strict compiler settings, extensionless imports in browser code, and explicit exported types at package boundaries. Oxlint is the current linter. Use PascalCase for React components/types, camelCase for functions, kebab-case for documentation, and CLI-generated timestamped names for Supabase migrations.

## Testing Guidelines

Vitest discovers `*.test.ts` and `*.test.tsx` beside source files. Add focused behavioral tests and regression tests for defects. Prioritize ownership boundaries, queue idempotency, private storage, and week-to-week personalization. Run `pnpm test`; no numeric coverage threshold is set yet.

## Commit & Pull Request Guidelines

History uses Conventional Commit-style subjects such as `build: initialize product foundation`. Use a short lowercase type (`build`, `chore`, `docs`, `feat`, `fix`, or `test`), an optional scope, and an imperative summary. Keep commits scoped and include migrations, tests, and documentation together when they describe one change. Pull requests should explain user impact, link the relevant issue or specification section, list verification performed, and include screenshots for UI or PDF changes.

## Security & Agent Instructions

Never commit real child data, credentials, generated private PDFs, or local environment files. Preserve parent-to-child-to-subscription ownership and the paper-first product philosophy. Treat `eng-tutor` as an upstream reference only; do not introduce a runtime dependency. Favor MVP-scale solutions and avoid features outside `docs/SPEC.md` without explicit approval.

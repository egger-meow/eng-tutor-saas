# Repository Guidelines

## Project Structure & Module Organization

This repository is currently specification-first. The product and technical contract lives in `docs/SPEC.md`; read it before making product, data-model, or architecture changes. As implementation is added, follow the proposed layout: `apps/web/src/` for the web application, `generator/` for curriculum and weekly-material generation, `pdf/` for templates and rendering, `supabase/migrations/` and `supabase/functions/` for backend changes, and `.github/workflows/` for CI. Keep supporting design decisions in `docs/`.

## Build, Test, and Development Commands

No build system or package manifest has been committed yet. Do not invent commands in documentation. After a toolchain is introduced, expose the standard workflows through repository-level scripts (for example, `npm run dev`, `npm test`, `npm run lint`, and `npm run build`) and update this section in the same change. Current documentation checks can use:

```powershell
rg "^#" docs/SPEC.md       # inspect specification structure
git diff --check           # detect whitespace errors
```

## Coding Style & Naming Conventions

Prefer simple architecture, explicit state, idempotent operations, and easily debugged code. Use the formatter and linter selected by the eventual application scaffold; commit their configuration with the first source files. Until then, keep Markdown concise, use descriptive headings, UTF-8 encoding, and one concept per section. Use kebab-case for documentation and prompt filenames (for example, `weekly-material.md`) and timestamped, descriptive names for Supabase migrations.

## Testing Guidelines

Add focused tests alongside each implementation area and regression tests for defects. Prioritize ownership boundaries (parent, child, subscription), generation-job idempotency, private storage access, and week-to-week personalization. Name tests after observable behavior rather than internal methods. Once a framework is chosen, document its test file pattern and coverage command here; no coverage threshold currently exists.

## Commit & Pull Request Guidelines

Git history is not available in this workspace, so no repository-specific commit convention can be inferred. Use short, imperative subjects such as `Add generation job schema`. Keep commits scoped and include migrations, tests, and documentation together when they describe one change. Pull requests should explain the user impact, link the relevant issue or specification section, list verification performed, and include screenshots for UI or PDF changes.

## Security & Agent Instructions

Never commit real child data, credentials, generated private PDFs, or local environment files. Preserve parent-to-child-to-subscription ownership and the paper-first product philosophy. Treat `eng-tutor` as an upstream reference only; do not introduce a runtime dependency. Favor MVP-scale solutions and avoid features outside `docs/SPEC.md` without explicit approval.

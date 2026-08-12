# 紙屬英文

Paper-first, personalized weekly English materials for Taiwanese junior-high learners. The parent portal is a static React application; Supabase owns authentication, tenant data, private PDFs, and the generation queue.

## Start locally

Requirements: Node.js 24+, pnpm 11+, and Docker only when running Supabase locally.

```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

The browser app accepts only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never place a secret or service-role key in a `VITE_` variable.

## Verify

```powershell
pnpm lint
pnpm test
pnpm test:db
pnpm typecheck
pnpm build
```

For local backend work, inspect available commands with `pnpm exec supabase --help`, then use `pnpm exec supabase start` and `pnpm exec supabase db reset`. This project uses ports `55320`–`55329` so it can run beside another default Supabase stack.

Read `docs/SPEC.md` before changing product behavior. The future ChatGPT Work schedule is intentionally not enabled yet; its operational contract is in `docs/generation-workflow.md`.

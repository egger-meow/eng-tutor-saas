# Paper English｜個人化紙本英語教材

Paper-first, personalized weekly English materials for Taiwanese junior-high learners. The parent portal is a static React application; Supabase owns authentication, tenant data, private PDFs, and the generation queue.

## Copyright and permitted access

© 2026 JJMowLab. All Rights Reserved.

This repository is proprietary, non-open-source software. Its source code is publicly viewable for transparency and evaluation only. Except for rights that cannot legally be restricted, no permission is granted to copy, reproduce, modify, redistribute, sublicense, sell, commercially use, create derivative works from, or deploy this software without prior written permission from JJMowLab. Third-party components remain subject to their respective licenses. See [`NOTICE`](NOTICE).

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
pnpm test:e2e
pnpm typecheck
pnpm build
```

For local backend work, inspect available commands with `pnpm exec supabase --help`, then use `pnpm exec supabase start` and `pnpm exec supabase db reset`. This project uses ports `55320`–`55329` so it can run beside another default Supabase stack.

## Web application structure

Public and authenticated route pages live in `apps/web/src/routes/`; reusable UI is grouped under `apps/web/src/components/`, and browser-safe Supabase access stays in `apps/web/src/lib/`. Production is a root-based Cloudflare Workers Static Assets SPA at [paperbond.jjmowlab.com](https://paperbond.jjmowlab.com). The deployment workflow runs `wrangler deploy`; `wrangler.jsonc` publishes `apps/web/dist`, maps the production custom domain, and serves SPA deep links without a copied `404.html` fallback.

The deploy environment requires GitHub repository variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_PADDLE_CLIENT_TOKEN`, plus secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Generation-worker and server credentials remain separate and must never be exposed through `VITE_*` variables. Set production Supabase Auth Site URL and redirect allow-list to `https://paperbond.jjmowlab.com`, set the admin/notification server `SITE_URL` to the same origin, and approve the domain in Paddle before production checkout.

`pnpm test:e2e` is local-only and refuses non-local Supabase URLs. It creates a synthetic parent, child, and Week 1 job; renders and uploads both PDFs; verifies an authenticated signed download; submits feedback; confirms that Week 2 receives it; then removes all synthetic records and artifacts.

Read `docs/SPEC.md` before changing product behavior. The future ChatGPT Work schedule is intentionally not enabled yet; its operational contract is in `docs/generation-workflow.md`.

## Generate the synthetic PDF pair

Install the pinned Chromium runtime once, then generate the validated fixture:

```powershell
pnpm --filter @paper-english/pdf pdf:install
pnpm generate:synthetic
```

The command writes private, git-ignored artifacts to `output/pdf/`. It validates one canonical lesson, derives both the Student Worksheet and Parent Answer Guide from it, and replaces only the two synthetic outputs. If Chromium is missing, rerun the install command. Production child data and Supabase access are intentionally outside this local slice.

## Run the Generation Worker

Production commands require `SUPABASE_URL` and a server-only `SUPABASE_SECRET_KEY`:

```powershell
pnpm worker claim --worker local-operator
```

See `docs/generation-workflow.md` for context and completion commands. Never expose the generation-worker key in the Cloudflare static bundle or commit generated customer artifacts.

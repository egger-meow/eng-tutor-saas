# Parent Portal

Static React/TypeScript SPA for authenticated parent workflows. Run it from the repository root with `pnpm dev`; production output is written to `apps/web/dist`.

Only browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values belong here. Worker credentials and generation logic must never enter this package.

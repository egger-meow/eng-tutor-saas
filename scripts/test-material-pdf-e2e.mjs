import { spawnSync } from 'node:child_process'
const status = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'env'], { encoding: 'utf8' })
if (status.status !== 0) throw new Error('Local Supabase status failed')
const local = Object.fromEntries([...status.stdout.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]))
const result = spawnSync(process.execPath, ['packages/worker/node_modules/tsx/dist/cli.mjs', 'packages/worker/src/material-pdf-e2e.ts'], {
  stdio: 'inherit', env: { ...process.env, SUPABASE_URL: local.API_URL,
    SUPABASE_SECRET_KEY: local.SERVICE_ROLE_KEY || local.SECRET_KEY,
    SUPABASE_PUBLISHABLE_KEY: local.ANON_KEY || local.PUBLISHABLE_KEY },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1

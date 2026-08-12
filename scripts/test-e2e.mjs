import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync } from 'node:fs'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) { process.stderr.write(result.stderr ?? ''); process.exit(result.status ?? 1) }
  return result.stdout ?? ''
}

const status = run(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'env'])
const local = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]))
if (!local.API_URL || !local.SECRET_KEY || !local.PUBLISHABLE_KEY) throw new Error('Could not read local Supabase status')

const result = spawnSync(process.execPath, ['packages/worker/node_modules/tsx/dist/cli.mjs', 'packages/worker/src/e2e-local.ts'], {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: local.API_URL, SUPABASE_SECRET_KEY: local.SECRET_KEY, SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY },
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

if (!process.env.npm_execpath) throw new Error('test:e2e must be run through pnpm')
run(process.execPath, [process.env.npm_execpath, '--filter', '@paper-english/web', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/eng-tutor-saas/' },
})
copyFileSync('apps/web/dist/index.html', 'apps/web/dist/404.html')
const hostedEntry = readFileSync('apps/web/dist/404.html', 'utf8')
if (!hostedEntry.includes('/eng-tutor-saas/assets/')) {
  throw new Error('Hosted SPA entry does not use the GitHub Pages repository base path')
}

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) { process.stderr.write(result.stderr ?? ''); process.exit(result.status ?? 1) }
  return result.stdout ?? ''
}

const status = run(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'env'])
const local = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]))
const secretKey = local.SERVICE_ROLE_KEY || local.SECRET_KEY
const publishableKey = local.ANON_KEY || local.PUBLISHABLE_KEY
if (!local.API_URL || !secretKey || !publishableKey) throw new Error('Could not read local Supabase status')

const result = spawnSync(process.execPath, ['packages/worker/node_modules/tsx/dist/cli.mjs', 'packages/worker/src/e2e-local.ts'], {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: local.API_URL, SUPABASE_SECRET_KEY: secretKey, SUPABASE_PUBLISHABLE_KEY: publishableKey },
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

if (!process.env.npm_execpath) throw new Error('test:e2e must be run through pnpm')
run(process.execPath, [process.env.npm_execpath, '--filter', '@paper-english/web', 'build'], {
  stdio: 'inherit',
  env: process.env,
})
const hostedEntry = readFileSync('apps/web/dist/index.html', 'utf8')
if (!hostedEntry.includes('/assets/')) {
  throw new Error('Hosted SPA entry does not use root-based asset paths')
}
if (existsSync('apps/web/dist/404.html')) {
  throw new Error('Cloudflare Pages build must not contain a GitHub Pages 404 fallback')
}

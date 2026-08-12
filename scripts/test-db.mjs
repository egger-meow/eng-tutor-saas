import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const container = 'supabase_db_eng-tutor-saas'
const source = resolve('supabase/tests/smoke.sql')
const target = `${container}:/tmp/eng-tutor-smoke.sql`

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('docker', ['cp', source, target])
run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', '/tmp/eng-tutor-smoke.sql'])

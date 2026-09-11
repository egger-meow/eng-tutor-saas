import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const container = 'supabase_db_eng-tutor-saas'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

for (const file of ['smoke.sql', 'diversity-format-memory.sql', 'diversity-release-compatibility.sql', 'assessment-foundation.sql', 'assessment-conformance.sql']) {
  const source = resolve('supabase/tests', file)
  const destination = `/tmp/eng-tutor-${file}`
  run('docker', ['cp', source, `${container}:${destination}`])
  run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', destination])
}

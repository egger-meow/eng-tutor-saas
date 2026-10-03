import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const container = process.env.LOCAL_SUPABASE_TEST_CONTAINER ?? 'supabase_db_eng-tutor-saas'
if (!/^supabase_db_eng-tutor-(saas|robustness-replay)$/.test(container)) throw new Error('Only approved local test containers are supported')

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('docker', ['cp', resolve('supabase/tests/material-pdf.sql'), `${container}:/tmp/eng-tutor-material-pdf.sql`])
run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', '/tmp/eng-tutor-material-pdf.sql'])

for (const file of ['robustness-followup.sql', 'smoke.sql', 'p2-robustness-repairs.sql', 'diversity-format-memory.sql', 'diversity-release-compatibility.sql', 'prompt-patch-release-compatibility.sql', 'assessment-foundation.sql', 'assessment-conformance.sql', 'assessment-curated-rpcs.sql', 'assessment-projection.sql', 'assessment-generation-context.sql', 'assessment-retake-lifecycle.sql', 'assessment-single-active-and-concurrency.sql', 'authoring-unsubmitted-leases.sql', 'authoring-batch-cap.sql', 'student-material-projection.sql']) {
  const source = resolve('supabase/tests', file)
  const destination = `/tmp/eng-tutor-${file}`
  run('docker', ['cp', source, `${container}:${destination}`])
  run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-f', destination])
}

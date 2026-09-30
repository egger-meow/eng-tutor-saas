// Synthetic local artifacts only; no learner jobs, database, uploads, or notifications.
import { syntheticWeekOne } from '../packages/generator/src/index.js'
import { curriculumSample } from '../packages/pdf/src/generate-curriculum-sample.js'
import { inspectPdf } from '../packages/pdf/src/inspect-pdf.js'
import { renderMaterialPdf } from '../packages/worker/src/material-pdf.js'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('output/pdf', { recursive: true })
const measurements = []
for (const [label, source] of [['legacy', syntheticWeekOne], ['curriculum', curriculumSample]] as const) {
  const before = JSON.stringify(source)
  const started = performance.now()
  const first = await renderMaterialPdf(source, 'student')
  const milliseconds = Math.round(performance.now() - started)
  const second = await renderMaterialPdf(source, 'student')
  const inspection = await inspectPdf(first, label)
  const repeated = await inspectPdf(second, label)
  if (inspection.layoutFingerprint !== repeated.layoutFingerprint) throw new Error('Nonrepeatable PDF layout')
  if (JSON.stringify(source) !== before) throw new Error('Canonical source mutated')
  await writeFile(`output/pdf/s5-${label}-student.pdf`, first)
  measurements.push({ label, bytes: first.byteLength, pages: inspection.pageCount, renderMs: milliseconds,
    layoutFingerprint: inspection.layoutFingerprint })
}
await writeFile('output/pdf/s5-measurements.json', JSON.stringify(measurements, null, 2))
console.log(JSON.stringify(measurements))

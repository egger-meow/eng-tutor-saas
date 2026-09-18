import { readFile, writeFile } from 'node:fs/promises'
import { buildStageAwareAuthoringBundleCandidate } from '../src/bundle-presentation-candidate.js'
import { compactAuthoringBundle } from '../src/authoring-context.js'
import { measureContextText } from '../src/model-context.js'

const source = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
const rows = (['author', 'repair'] as const).map((mode) => {
  const candidate = buildStageAwareAuthoringBundleCandidate(source, mode)
  const before = measureContextText(compactAuthoringBundle(source))
  const after = measureContextText(compactAuthoringBundle(candidate.content))
  return {
    mode,
    before,
    after,
    savedChars: before.chars - after.chars,
    savedBytes: before.bytes - after.bytes,
    reductionPercent: Number(((before.chars - after.chars) * 100 / before.chars).toFixed(2)),
    omitted: candidate.omitted,
  }
})
const report = {
  status: 'enabled-in-local-production-authoring-runtime',
  runtimeEnabled: true,
  scope: 'Exact whole-stage omission after packet planning. Shared rules, rubric, CAP contract, schema, interest policy, Author, and Critic remain byte-identical. Repair remains in repair mode.',
  qualityBoundary: 'Character/byte reduction and deterministic retention do not prove model teaching-quality equivalence. Paired model review remains an explicit follow-up limitation.',
  immutableSourceBundle: measureContextText(source),
  rows,
}
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))

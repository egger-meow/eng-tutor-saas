import { createHash } from 'node:crypto'

const STAGE_HEADINGS = [
  '## 5. Prompt 01: Planning Engine',
  '## 6. Prompt 02: Authoring Engine',
  '## 7. Prompt 03: Critic Engine',
  '## 8. Prompt 04: Repair Specialist',
] as const

export type AuthoringBundleCandidateMode = 'author' | 'repair'

export type AuthoringBundleCandidate = {
  content: string
  sourceSha256: string
  candidateSha256: string
  omitted: Array<{
    heading: (typeof STAGE_HEADINGS)[number]
    chars: number
    reason: string
  }>
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function uniqueHeadingOffset(bundle: string, heading: string): number {
  const first = bundle.indexOf(heading)
  if (first < 0 || bundle.indexOf(heading, first + heading.length) >= 0) {
    throw new Error(`AUTHORING_BUNDLE_STAGE_BOUNDARY_INVALID:${heading}`)
  }
  return first
}

/**
 * Runtime model-input view. It never rewrites the immutable compiled bundle.
 * Kept sections remain byte-for-byte identical and parsing fails closed.
 */
export function buildStageAwareAuthoringBundleCandidate(
  bundle: string,
  mode: AuthoringBundleCandidateMode,
): AuthoringBundleCandidate {
  const offsets = STAGE_HEADINGS.map((heading) => uniqueHeadingOffset(bundle, heading))
  if (offsets.some((offset, index) => index > 0 && offset <= offsets[index - 1])) {
    throw new Error('AUTHORING_BUNDLE_STAGE_ORDER_INVALID')
  }

  const spans = STAGE_HEADINGS.map((heading, index) => ({
    heading,
    start: offsets[index],
    end: index + 1 < offsets.length ? offsets[index + 1] : bundle.length,
  }))
  const omittedHeadings = new Set<(typeof STAGE_HEADINGS)[number]>([
    STAGE_HEADINGS[0],
    ...(mode === 'author' ? [STAGE_HEADINGS[3]] : []),
  ])
  const omitted = spans.filter(({ heading }) => omittedHeadings.has(heading))
  const content = spans.reduceRight(
    (result, span) => omittedHeadings.has(span.heading)
      ? result.slice(0, span.start) + result.slice(span.end)
      : result,
    bundle,
  ).trimEnd() + '\n'

  return {
    content,
    sourceSha256: sha256(bundle),
    candidateSha256: sha256(content),
    omitted: omitted.map(({ heading, start, end }) => ({
      heading,
      chars: end - start,
      reason: heading === STAGE_HEADINGS[0]
        ? 'The approved packet plan and learner evidence are supplied as runtime inputs; Planner actions are complete before authoring.'
        : 'Normal authoring has no repair findings or previous candidate; Repair actions apply only to repair mode.',
    })),
  }
}


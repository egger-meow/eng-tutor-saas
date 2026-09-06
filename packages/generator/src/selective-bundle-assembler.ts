import type { CapDesignAnchor } from './cap-precedent-audit.js'

/**
 * Injects selectively retrieved, authoritative CAP precedent cards into the authoring bundle,
 * ensuring no large 195-card routing table enters the LLM prompt context while providing
 * the exact 1–5 precedent cards needed for the claimed lesson's items.
 */
export function assembleSelectiveAuthoringBundle(
  baseBundle: string,
  expandedPrecedents: CapDesignAnchor[] = [],
): string {
  const compactIndexMarker = '## 2B. Compact CAP Precedent Routing Index'
  const selectiveMarker = '## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)'
  const nextSection = '## 3. Model Quality Profile Resolution'

  const compactIndexPos = baseBundle.indexOf(compactIndexMarker)
  const selectivePos = baseBundle.indexOf(selectiveMarker)
  const nextSectionPos = baseBundle.indexOf(nextSection)

  const boundedSection = [
    '## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)',
    'The following bounded authoritative CAP precedent cards have been selectively retrieved for this claimed lesson context from verified shards.',
    'Anchor, blend, or calibrate against these relevant design principles without structural imitation.',
    '```json',
    JSON.stringify(expandedPrecedents, null, 2),
    '```',
    '',
    '',
  ].join('\n')

  if (compactIndexPos !== -1 && nextSectionPos !== -1 && nextSectionPos > compactIndexPos) {
    // Replace compact routing index
    return baseBundle.slice(0, compactIndexPos) + boundedSection + baseBundle.slice(nextSectionPos)
  }

  if (selectivePos !== -1 && nextSectionPos !== -1 && nextSectionPos > selectivePos) {
    // Replace existing selective precedent section
    return baseBundle.slice(0, selectivePos) + boundedSection + baseBundle.slice(nextSectionPos)
  }

  if (nextSectionPos !== -1) {
    // Insert immediately before section 3
    return baseBundle.slice(0, nextSectionPos) + boundedSection + baseBundle.slice(nextSectionPos)
  }

  // Fallback: append at end
  return `${baseBundle.trimEnd()}\n\n${boundedSection}`
}

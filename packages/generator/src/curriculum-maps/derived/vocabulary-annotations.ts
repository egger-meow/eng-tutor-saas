export interface VocabAnnotation {
  id: string
  word: string
  suggestedGradeLevel: 7 | 8 | 9
  theme: string
  annotationSource: 'paper-english-derived'
}

export function getSuggestedGradeForWord(band: 'core-1200' | 'ext-800', index: number): 7 | 8 | 9 {
  if (band === 'core-1200') {
    return index < 600 ? 7 : 8
  }
  return 9
}

export function getThemeForWord(word: string): string {
  const lower = word.toLowerCase()
  if (/robot|machine|device|computer|internet|science|experiment|energy|camera|data/i.test(lower)) return 'science-tech'
  if (/school|teacher|class|lesson|grade|student|pencil|book|desk|homework|exam/i.test(lower)) return 'school-life'
  if (/food|rice|bread|cake|eat|drink|cook|restaurant|menu|apple|banana|delicious/i.test(lower)) return 'food-dining'
  if (/cat|dog|pet|animal|puppy|bird|lion|bear|shelter|rescue|fish|duck/i.test(lower)) return 'animals-nature'
  if (/basketball|soccer|tennis|sport|game|player|team|race|run|swim|stadium/i.test(lower)) return 'sports-athletics'
  if (/travel|trip|station|airplane|hotel|visit|map|direction|ticket|tour/i.test(lower)) return 'travel-places'
  return 'daily-life'
}

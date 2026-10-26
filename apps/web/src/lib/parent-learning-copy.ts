// Presentation only. Canonical evidence and authoring inputs remain unchanged.
const learningTerms: Record<string, string> = {
  'g7-time-place-prepositions': '時間與地點介系詞',
  'g7-imperatives': '祈使句',
  'past-participle': '過去分詞',
  'past-tense': '過去式',
  'reading-inference': '閱讀推論',
  'reading-detail': '閱讀細節',
  'imperatives': '祈使句',
  'evidence-backed spaced review': '依作答記錄安排間隔複習',
  'spaced review': '間隔複習',
  'AI stem separation': 'AI 音訊分離',
}
export function parentLearningCopy(value: string): string {
  let text = value
  for (const [term, label] of Object.entries(learningTerms)) text = text.replaceAll(term, label)
  // Unmapped internal IDs are not meaningful curriculum descriptions for parents.
  return text.replace(/\b(?:g[789]|og|cf|rt)-[a-z0-9-]+\b/gi, '相關練習')
}

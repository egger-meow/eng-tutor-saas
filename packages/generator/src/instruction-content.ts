/** Extract authored teaching prose without schema tags or identifiers. */
export function instructionTexts(section: Record<string, any>): string[] {
  if (Array.isArray(section.blocks)) {
    return section.blocks.flatMap((block: Record<string, any>) => {
      const title = typeof block.titleZh === 'string' ? [block.titleZh] : []
      switch (block.type) {
        case 'prose': return [...title, block.textZh]
        case 'bullets':
        case 'steps': return [...title, ...block.itemsZh]
        case 'comparison': return [...title, ...block.headers, ...block.rows.flat(), ...(block.takeawayZh ? [block.takeawayZh] : [])]
        case 'worked-example': return [...title, block.example, block.walkthroughZh]
        case 'error-analysis': return [...title, block.wrong, block.corrected, block.whyZh]
        default: return title
      }
    })
  }
  return [section.explanationZh, ...(section.patterns ?? []),
    ...(section.workedExamples ?? []).flatMap((example: any) => [example.example, example.walkthroughZh]),
    ...(section.commonMistakes ?? []).flatMap((mistake: any) => [mistake.wrong, mistake.corrected, mistake.whyZh]),
  ].filter((text): text is string => typeof text === 'string')
}

import type {
  CurriculumPackageV22,
  CurriculumPackageV23,
} from '../curriculum-package-schema.js'

export type GroundedFixtureTheme = 'basketball' | 'anime' | 'technology'

const THEME_RESEARCH = {
  basketball: {
    topic: 'The NBA three-point line',
    knowledgeType: 'event' as const,
    source: {
      id: 'source-nba-history',
      url: 'https://www.nba.com/news/history-of-the-3-pointer',
      title: 'History of the 3-pointer',
      publisher: 'NBA',
    },
    claims: [
      'The NBA adopted the three-point line in 1979.',
      'The line rewards shots made from longer distance.',
      'Teams use spacing to create room for those shots.',
    ],
  },
  anime: {
    topic: 'How animation creates motion',
    knowledgeType: 'process' as const,
    source: {
      id: 'source-britannica-animation',
      url: 'https://www.britannica.com/art/animation',
      title: 'Animation',
      publisher: 'Encyclopaedia Britannica',
    },
    claims: [
      'Animation presents a sequence of images to create the impression of movement.',
      'Small changes between images help viewers perceive motion.',
      'Timing affects how fast an animated action appears.',
    ],
  },
  technology: {
    topic: 'How solar cells produce electricity',
    knowledgeType: 'process' as const,
    source: {
      id: 'source-energy-solar',
      url: 'https://www.energy.gov/eere/solar/solar-photovoltaic-technology-basics',
      title: 'Solar Photovoltaic Technology Basics',
      publisher: 'U.S. Department of Energy',
    },
    claims: [
      'Photovoltaic cells turn sunlight into electrical energy.',
      'Many solar cells connect together into a large frame.',
      'The electricity can power machines or enter the city system.',
    ],
  },
} satisfies Record<GroundedFixtureTheme, {
  topic: string
  knowledgeType: CurriculumPackageV23['grounding']['knowledgeType']
  source: { id: string; url: string; title: string; publisher: string }
  claims: readonly [string, string, string]
}>

export function makeGroundedCurriculumPackage(
  legacyPackage: CurriculumPackageV22,
  theme: GroundedFixtureTheme = 'technology',
): CurriculumPackageV23 {
  const value = structuredClone(legacyPackage) as unknown as CurriculumPackageV23
  const research = THEME_RESEARCH[theme]
  value.metadata.schemaVersion = '2.3.0'
  value.metadata.promptVersion = 'prompt/2.8.0'

  research.claims.forEach((claim, index) => {
    const block = value.studentLesson.reading.blocks[index]
    if (!block || !('text' in block)) {
      throw new Error(`Grounded fixture requires a text-bearing reading block at index ${index}`)
    }
    block.text = `${block.text} ${claim}`
  })

  value.grounding = {
    topic: research.topic,
    knowledgeType: research.knowledgeType,
    temporalMode: 'evergreen',
    researchedAt: '2026-08-24T00:00:00.000Z',
    sources: [{
      ...research.source,
      accessedAt: '2026-08-24T00:00:00.000Z',
    }],
    facts: research.claims.map((text, index) => ({
      id: `fact-${index + 1}`,
      text,
      sourceIds: [research.source.id],
      classification: 'fact',
    })),
    claims: research.claims.map((text, index) => ({
      id: `claim-${index + 1}`,
      factIds: [`fact-${index + 1}`],
      location: `studentLesson.reading.blocks.${index}.text`,
      text,
    })),
  }
  value.qualityEvidence.criticalChecks.push(
    { id: 'grounding-accuracy', passed: true, evidence: 'Critic verified each factual proposition against its declared source.' },
    { id: 'grounding-copyright', passed: true, evidence: 'Critic verified original educational synthesis without source-shaped copying.' },
    { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
    { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
    { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
    { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
    { id: 'level-calibration', passed: true, evidence: 'Language complexity and cognitive depth are properly calibrated to the learner profile without downshifting.' },
  )
  return value
}

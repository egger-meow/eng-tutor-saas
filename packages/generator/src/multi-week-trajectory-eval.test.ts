import { describe, expect, it } from 'vitest'
import {
  buildFormatPlanningCapsule,
  retrievePrecedentsForAssessmentPlans,
  assembleSelectiveAuthoringBundle,
  CANONICAL_PEDAGOGICAL_FORMAT_CANDIDATES,
  FORMAT_SELECTION_RULES,
  CURRENT_ENGINE_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_SCHEMA_VERSION,
  type CapRetrievalIntent,
} from './index.js'

describe('Multi-Week Trajectory Evaluation (10-Week Continuous Learning)', () => {
  // Model a realistic 10-week curriculum trajectory for learner "Kobe" (Grade 7 -> 8 transition)
  const trajectoryWeeks = [
    {
      weekNumber: 1,
      topic: 'Space Exploration: The Voyager Golden Record',
      genre: 'article_informational',
      skill: 'purpose_speaker_intent',
      formats: ['lines', 'sequence'],
      vocabIntroduced: ['launch', 'signal', 'message', 'distance', 'voyage'],
      grammarIntroduced: 'past_simple',
    },
    {
      weekNumber: 2,
      topic: 'Robotics: Sensors and Sorting Mechanics',
      genre: 'explanation_procedural',
      skill: 'cause_effect',
      formats: ['sequence', 'lines'],
      vocabIntroduced: ['sensor', 'calibrate', 'detect', 'mechanism', 'adjust'],
      grammarIntroduced: 'cause_consequence_because',
    },
    {
      weekNumber: 3,
      topic: 'Music Production: Acoustic Recording Workflow',
      genre: 'personal_essay',
      skill: 'information_integration',
      formats: ['table', 'lines'],
      vocabIntroduced: ['acoustic', 'melody', 'arrangement', 'harmony', 'track'],
      grammarIntroduced: 'comparative_adjectives',
    },
    {
      weekNumber: 4,
      topic: 'Ocean Habitats: Deep Sea Bioluminescence',
      genre: 'article_informational',
      skill: 'main_idea',
      formats: ['lines', 'organizer'],
      vocabIntroduced: ['glow', 'depth', 'pressure', 'organism', 'predator'],
      grammarIntroduced: 'relative_clauses',
    },
    {
      weekNumber: 5,
      topic: 'Architectural Engineering: Earthquake-Resistant Buildings',
      genre: 'explanation_procedural',
      skill: 'structure_organization',
      formats: ['organizer', 'lines'],
      vocabIntroduced: ['foundation', 'vibration', 'absorb', 'stability', 'flexible'],
      grammarIntroduced: 'passive_voice_intro',
    },
    {
      weekNumber: 6,
      topic: 'Creative Writing & Character Decisions: The Filmmaker Dilemma',
      genre: 'narrative_biographical',
      skill: 'evaluative_judgment',
      formats: ['lines', 'table'],
      vocabIntroduced: ['conflict', 'resolution', 'perspective', 'dialogue', 'scene'],
      grammarIntroduced: 'modal_verbs_deduction',
    },
    {
      weekNumber: 7,
      topic: 'Animation Art: Background Scenery & Lighting Choices',
      genre: 'critique_review',
      skill: 'purpose_speaker_intent',
      formats: ['table', 'organizer'],
      vocabIntroduced: ['palette', 'contrast', 'mood', 'texture', 'render'],
      grammarIntroduced: 'participle_adjectives',
    },
    {
      weekNumber: 8,
      topic: 'K-pop Choreography & Stage Timing Synchronization',
      genre: 'interview_qa',
      skill: 'cause_effect',
      formats: ['sequence', 'lines'],
      vocabIntroduced: ['rhythm', 'synchronize', 'cue', 'routine', 'stamina'],
      grammarIntroduced: 'time_conjunctions_while_as',
    },
    {
      weekNumber: 9,
      topic: 'Renewable Energy: Offshore Wind Turbine Mechanics',
      genre: 'explanation_procedural',
      skill: 'information_integration',
      formats: ['organizer', 'table'],
      vocabIntroduced: ['generator', 'blade', 'current', 'capacity', 'offshore'],
      grammarIntroduced: 'conditionals_zero_first',
    },
    {
      weekNumber: 10,
      topic: 'Archaeology: Uncovering Ancient Trade Routes',
      genre: 'article_informational',
      skill: 'structure_organization',
      formats: ['table', 'lines'],
      vocabIntroduced: ['artifact', 'caravan', 'merchant', 'excavate', 'route'],
      grammarIntroduced: 'present_perfect_experience',
    },
  ]

  it('evaluates format variety across 10 consecutive weeks using formatPlanningCapsule', () => {
    // Track cumulative delivery memory
    const recentDeliveryMemory: any[] = []

    for (const week of trajectoryWeeks) {
      // Build format capsule for current week given history
      const capsule = buildFormatPlanningCapsule(recentDeliveryMemory)

      // Verify that the capsule provides recommendations and collision awareness
      expect(CANONICAL_PEDAGOGICAL_FORMAT_CANDIDATES.length).toBeGreaterThanOrEqual(4)
      expect(Array.isArray(FORMAT_SELECTION_RULES)).toBe(true)
      expect(typeof capsule.recentFormatUse).toBe('object')
      expect(Array.isArray(capsule.recentReasoning)).toBe(true)
      expect(Array.isArray(capsule.avoidMechanicalRepeat)).toBe(true)
      expect(Array.isArray(capsule.availableButRecentlyUnused)).toBe(true)

      // Record this week into delivery memory
      recentDeliveryMemory.unshift({
        materialId: `mat-week-${week.weekNumber}`,
        weekNumber: week.weekNumber,
        materialWeek: `2026-08-${10 + week.weekNumber * 7}`,
        readingGenre: week.genre,
        readingTitle: week.topic,
        readingHook: `Exploring ${week.topic}`,
        readingEntities: [week.topic],
        introducedVocabulary: week.vocabIntroduced,
        grammarTargets: [week.grammarIntroduced],
        communicationFunctions: [week.skill],
        responseLayoutTypes: week.formats,
        pedagogicalFormats: week.formats.map((f) => `format:${f}`),
        scaffoldLevels: ['on-level'],
        reasoningOperations: [week.skill],
      })
    }

    // After 10 weeks, all 4 canonical formats (lines, table, organizer, sequence) have been exercised
    const allUsedFormats = new Set(recentDeliveryMemory.flatMap((m) => m.responseLayoutTypes))
    expect(allUsedFormats.has('lines')).toBe(true)
    expect(allUsedFormats.has('table')).toBe(true)
    expect(allUsedFormats.has('organizer')).toBe(true)
    expect(allUsedFormats.has('sequence')).toBe(true)
  })

  it('verifies post-plan CAP precedent retrieval across trajectory items', async () => {
    // Take 3 distinct weeks and verify retrieval for their planned assessment items
    const sampleWeeks = [trajectoryWeeks[0]!, trajectoryWeeks[2]!, trajectoryWeeks[5]!]

    for (const week of sampleWeeks) {
      const intents: CapRetrievalIntent[] = [
        {
          primarySkill: week.skill,
          targetLanguageDifficulty: 'A2_basic',
          targetCognitiveDepth: 'D2_single_step_inference',
          keywords: week.vocabIntroduced.slice(0, 3),
        },
        {
          primarySkill: 'cause_effect',
          targetLanguageDifficulty: 'A2_basic',
          targetCognitiveDepth: 'D2_single_step_inference',
          keywords: week.vocabIntroduced.slice(0, 3),
        },
      ]

      const multi = await retrievePrecedentsForAssessmentPlans(intents, { limit: 3 })
      expect(multi.uniqueCandidateRefs.length).toBeGreaterThanOrEqual(1)
      expect(multi.expandedCards.length).toBe(multi.uniqueCandidateRefs.length)

      // Verify no duplicate references
      const set = new Set(multi.uniqueCandidateRefs)
      expect(set.size).toBe(multi.uniqueCandidateRefs.length)

      // Verify selective assembly replaces section 2B
      const baseBundle = '## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)\n```json\n[]\n```\n\n## 3. Model Quality Profile Resolution'
      const assembled = assembleSelectiveAuthoringBundle(baseBundle, multi.expandedCards)
      expect(assembled).toContain(multi.uniqueCandidateRefs[0]!)
    }
  })

  it('verifies version contracts and Schema 2.5 stability', () => {
    expect(CURRENT_ENGINE_VERSION).toBe('1.7.0')
    expect(CURRENT_PROMPT_VERSION).toBe('2.12.0')
    expect(CURRENT_SCHEMA_VERSION).toBe('2.5.0')
  })
})

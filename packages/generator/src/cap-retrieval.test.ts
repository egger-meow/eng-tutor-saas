import { describe, expect, it, vi } from 'vitest'
import {
  filterAndRankCapPrecedents,
  batchRetrieveCapCandidates,
  expandCapPrecedents,
  scoreRoutingCard,
  type CapRoutingCard,
  type CapRetrievalIntent,
} from './cap-retrieval.js'

describe('Two-Stage CAP Precedent Candidate Retrieval and Shard Expansion', () => {
  const sampleCard1: CapRoutingCard = {
    ref: 'cap-ecbd8ecef915',
    genre: 'single',
    primarySkill: 'discourse_relationship',
    secondarySkills: ['discourse_relationship'],
    cognitiveDepth: 'D2_single_step_inference',
    languageDifficulty: 'A1_elementary',
    evidenceMode: 'text_only',
    evidenceSpan: 'single_sentence',
    shard: 'packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json',
  }

  const sampleCard2: CapRoutingCard = {
    ref: 'cap-1d58863aeaa1',
    genre: 'cloze_passage',
    primarySkill: 'discourse_relationship',
    secondarySkills: ['discourse_relationship'],
    cognitiveDepth: 'D2_single_step_inference',
    languageDifficulty: 'A2_basic',
    evidenceMode: 'text_only',
    evidenceSpan: 'cross_sentence_local',
    shard: 'packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json',
  }

  const sampleCard3: CapRoutingCard = {
    ref: 'cap-8016a6c08618',
    genre: 'infographic_chart_table',
    primarySkill: 'information_integration',
    secondarySkills: ['discourse_relationship'],
    cognitiveDepth: 'D2_single_step_inference',
    languageDifficulty: 'A2_basic',
    evidenceMode: 'multimodal_mixed',
    evidenceSpan: 'multimodal_text_and_graphic',
    shard: 'packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json',
  }

  it('scores cards with pedagogical fit preceding topic similarity', () => {
    const intent: CapRetrievalIntent = {
      primarySkill: 'discourse_relationship',
      targetCognitiveDepth: 'D2_single_step_inference',
      genre: 'single',
      targetLanguageDifficulty: 'A1_elementary',
      evidenceSpan: 'single_sentence',
    }

    const score1 = scoreRoutingCard(intent, sampleCard1)
    const score2 = scoreRoutingCard(intent, sampleCard2)
    const score3 = scoreRoutingCard(intent, sampleCard3)

    expect(score1).toBeGreaterThan(score2)
    expect(score2).toBeGreaterThan(score3)
  })

  it('applies diversity penalty to recent precedent refs and recent delivery memory', () => {
    const intent: CapRetrievalIntent = {
      primarySkill: 'discourse_relationship',
      targetCognitiveDepth: 'D2_single_step_inference',
      genre: 'single',
    }

    const baseScore = scoreRoutingCard(intent, sampleCard1)
    const penalizedScore = scoreRoutingCard(intent, sampleCard1, {
      recentPrecedentRefs: ['cap-ecbd8ecef915'],
      recentDeliveryMemory: [
        {
          materialWeek: '2026-W34',
          readingGenre: 'single',
          readingTitle: 'Prior topic',
          introducedVocabulary: [],
          responseLayoutTypes: ['lines'],
          pedagogicalFormats: [],
        },
      ],
    })

    expect(penalizedScore).toBeLessThan(baseScore)
    expect(baseScore - penalizedScore).toBeCloseTo(2.0)
  })

  it('filters and ranks real canonical CAP cards from the routing index', () => {
    const intent: CapRetrievalIntent = {
      primarySkill: 'information_integration',
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      genre: 'infographic_chart_table',
    }

    const result = filterAndRankCapPrecedents(intent, { limit: 3 })
    expect(result.authorityStatus).toBe('authoritative')
    expect(result.candidates.length).toBeGreaterThanOrEqual(1)
    expect(result.candidates[0]!.primarySkill).toBe('information_integration')
    expect(result.shardsCovered.length).toBeGreaterThanOrEqual(1)
  })

  it('batches candidate retrieval across multiple pedagogical question intents', () => {
    const intents: CapRetrievalIntent[] = [
      { primarySkill: 'discourse_relationship' },
      { primarySkill: 'vocabulary_in_context' },
      { primarySkill: 'grammar_in_context' },
    ]

    const batch = batchRetrieveCapCandidates(intents, { limit: 2 })
    expect(batch.size).toBe(3)
    expect(batch.get(0)?.candidates[0]?.primarySkill).toBe('discourse_relationship')
    expect(batch.get(1)?.candidates[0]?.primarySkill).toBe('vocabulary_in_context')
    expect(batch.get(2)?.candidates[0]?.primarySkill).toBe('grammar_in_context')
  })

  it('deduplicates shard expansion reads when multiple candidates share the same shard file', async () => {
    const shardMock = {
      version: '1.1.0',
      authorityStatus: 'authoritative',
      cards: [
        {
          ref: 'cap-ecbd8ecef915',
          primarySkill: 'discourse_relationship',
          questionMechanism: 'mechanism-1',
          whyTheQuestionWorks: 'works-1',
          correctAnswerConstructionPrinciple: 'p1',
          distractorStrategies: ['strat1'],
          reusableDesignPrinciple: 'dp1',
          difficultyAdjustment: { simplificationConstraints: [], depthAdjustmentStrategies: [] },
          copyGuardHashes: [],
        },
        {
          ref: 'cap-1d58863aeaa1',
          primarySkill: 'discourse_relationship',
          questionMechanism: 'mechanism-2',
          whyTheQuestionWorks: 'works-2',
          correctAnswerConstructionPrinciple: 'p2',
          distractorStrategies: ['strat2'],
          reusableDesignPrinciple: 'dp2',
          difficultyAdjustment: { simplificationConstraints: [], depthAdjustmentStrategies: [] },
          copyGuardHashes: [],
        },
      ],
    }

    const readerSpy = vi.fn().mockResolvedValue(JSON.stringify(shardMock))

    const expanded = await expandCapPrecedents(['cap-ecbd8ecef915', 'cap-1d58863aeaa1'], {
      shardReader: readerSpy,
    })

    // Both cards share the discourse_relationship--D2_single_step_inference.json shard
    expect(readerSpy).toHaveBeenCalledTimes(1)
    expect(expanded).toHaveLength(2)
    expect(expanded[0]!.ref).toBe('cap-ecbd8ecef915')
    expect(expanded[1]!.ref).toBe('cap-1d58863aeaa1')
  })
})

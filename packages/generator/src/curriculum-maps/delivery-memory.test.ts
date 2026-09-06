import { describe, expect, it } from 'vitest'
import {
  extractDeliveryMemory,
  aggregateRecentResponseForms,
  aggregateRecentDeliveryMemory,
  buildDiversityCapsule,
  type DeliveryMemoryProjection,
} from './diversity-capsule.js'

describe('Delivery Memory Projection and Shared Cross-Week Memory', () => {
  const sampleV25Package = {
    metadata: {
      schemaVersion: '2.5.0',
      weekNumber: 4,
      materialWeek: '2026-W35',
    },
    trackingDelta: {
      introducedVocabularyIds: ['vocab-robot', 'vocab-sensor', 'vocab-calibrate'],
    },
    studentLesson: {
      reading: {
        genre: 'article',
        title: 'Calibrating the Optical Sensor',
      },
      practice: [
        {
          stage: 'guided',
          questions: [
            {
              id: 'G1',
              itemType: 'short-response',
              writingLines: 0,
              responseLayout: {
                type: 'organizer',
                headers: ['Measurement', 'Value'],
                rows: [{ cells: [{ text: 'Baseline' }, { responseUnitId: 'u1' }] }],
              },
            },
            {
              id: 'G2',
              itemType: 'inference',
              writingLines: 0,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
            },
          ],
        },
        {
          stage: 'production',
          questions: [
            {
              id: 'P1',
              itemType: 'sequence',
              writingLines: 0,
              responseLayout: {
                type: 'sequence',
                layoutDirection: 'horizontal',
                items: [
                  { stepNumber: 1, content: 'Power on' },
                  { stepNumber: 2, responseUnitId: 's1' },
                ],
              },
            },
          ],
        },
      ],
      homework: {
        questions: [
          {
            id: 'H1',
            itemType: 'sentence-production',
            writingLines: 3,
          },
        ],
      },
    },
  }

  it('extracts structured delivery memory projection from package', () => {
    const memory = extractDeliveryMemory(sampleV25Package)

    expect(memory.materialWeek).toBe('2026-W35')
    expect(memory.weekNumber).toBe(4)
    expect(memory.readingGenre).toBe('article')
    expect(memory.readingTitle).toBe('Calibrating the Optical Sensor')
    expect(memory.introducedVocabulary).toEqual(['vocab-robot', 'vocab-sensor', 'vocab-calibrate'])
    expect(memory.responseLayoutTypes).toContain('organizer')
    expect(memory.responseLayoutTypes).toContain('sequence')
    expect(memory.responseLayoutTypes).toContain('lines')
    expect(memory.pedagogicalFormats).toContain('table:organizer')
    expect(memory.pedagogicalFormats).toContain('sequence:horizontal')
    expect(memory.pedagogicalFormats).toContain('written:lines')
    expect(memory.pedagogicalFormats).toContain('mcq:4-option')
  })

  it('aggregates recent response forms across multiple weeks', () => {
    const mem1: DeliveryMemoryProjection = {
      materialWeek: '2026-W33',
      readingGenre: 'dialogue',
      readingTitle: 'Lab Meeting',
      introducedVocabulary: ['lab'],
      responseLayoutTypes: ['lines'],
      pedagogicalFormats: ['written:lines', 'mcq:4-option'],
    }
    const mem2: DeliveryMemoryProjection = {
      materialWeek: '2026-W34',
      readingGenre: 'article',
      readingTitle: 'Solar Panels',
      introducedVocabulary: ['solar'],
      responseLayoutTypes: ['table'],
      pedagogicalFormats: ['table:grid', 'written:lines'],
    }

    const forms = aggregateRecentResponseForms([mem1, mem2])
    expect(forms).toContain('lines')
    expect(forms).toContain('table')
    expect(forms).toContain('written:lines')
    expect(forms).toContain('table:grid')
    expect(forms).toContain('mcq:4-option')
  })

  it('buildDiversityCapsule preserves recentDeliveryMemory and recentResponseForms', () => {
    const memory = extractDeliveryMemory(sampleV25Package)
    const capsule = buildDiversityCapsule([memory], 4)

    expect(capsule.recentGenres).toEqual(['article'])
    expect(capsule.recentContextKeys).toEqual(['Calibrating the Optical Sensor'])
    expect(capsule.recentResponseForms).toContain('organizer')
    expect(capsule.recentResponseForms).toContain('sequence')
    expect(capsule.recentResponseForms).toContain('table:organizer')
    expect(capsule.recentDeliveryMemory).toHaveLength(1)
    expect(capsule.recentDeliveryMemory![0]?.materialWeek).toBe('2026-W35')
  })

  it('handles Week 1 empty memory baseline with safe deterministic defaults', () => {
    const emptyCapsule = buildDiversityCapsule([], 4)
    expect(emptyCapsule.recentGenres).toEqual([])
    expect(emptyCapsule.recentContextKeys).toEqual([])
    expect(emptyCapsule.recentItemFamilies).toEqual([])
    expect(emptyCapsule.recentResponseForms).toBeUndefined()
    expect(emptyCapsule.recentDeliveryMemory).toBeUndefined()

    const emptyForms = aggregateRecentResponseForms([])
    expect(emptyForms).toEqual([])

    const bounded = aggregateRecentDeliveryMemory([])
    expect(bounded).toEqual([])
  })

  it('strictly bounds delivery memory to lookback window (dropping older weeks)', () => {
    const weeks: DeliveryMemoryProjection[] = [1, 2, 3, 4, 5, 6].map((w) => ({
      weekNumber: w,
      materialWeek: `2026-W${30 + w}`,
      readingGenre: w % 2 === 0 ? 'dialogue' : 'article',
      readingTitle: `Topic ${w}`,
      introducedVocabulary: [`word-${w}`],
      responseLayoutTypes: w === 1 ? ['lines'] : ['table', 'sequence'],
      pedagogicalFormats: [`format-${w}`],
    }))

    const bounded = aggregateRecentDeliveryMemory(weeks, 4)
    expect(bounded).toHaveLength(4)
    expect(bounded.map((b) => b.weekNumber)).toEqual([3, 4, 5, 6])

    const recentForms = aggregateRecentResponseForms(weeks, 4)
    expect(recentForms).toContain('table')
    expect(recentForms).toContain('sequence')
    expect(recentForms).not.toContain('format-1')
    expect(recentForms).not.toContain('format-2')
    expect(recentForms).toContain('format-5')
    expect(recentForms).toContain('format-6')
  })

  it('conforms DB aggregate_format_memory output structure to TypeScript adapter input', () => {
    // Exact schema emitted by public.aggregate_format_memory in PostgreSQL
    const simulatedDbResult = {
      recentDeliveryMemory: [
        {
          snapshotId: '550e8400-e29b-41d4-a716-446655440000',
          materialId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          weekNumber: 3,
          materialWeek: '2026-W35',
          readingGenre: 'article',
          readingTitle: 'Calibrating the Optical Sensor',
          readingHook: 'How sensors perceive light.',
          readingEntities: ['optical sensor', 'photodiode'],
          introducedVocabulary: ['vocab-sensor', 'vocab-calibrate'],
          grammarTargets: ['g7-past-simple-irregular'],
          communicationFunctions: ['cf-asking-clarification'],
          responseLayoutTypes: ['organizer', 'sequence'] as Array<'lines' | 'table' | 'organizer' | 'sequence'>,
          pedagogicalFormats: ['table:organizer', 'sequence:horizontal', 'written:lines', 'mcq:4-option', 'itemType:short-response'],
          scaffoldLevels: ['supported', 'standard'],
          reasoningOperations: ['short-response', 'D2_single_step_inference'],
        },
      ],
      recentResponseForms: [
        'organizer',
        'sequence',
        'table:organizer',
        'sequence:horizontal',
        'written:lines',
        'mcq:4-option',
        'itemType:short-response',
      ],
    }

    const capsule = buildDiversityCapsule(simulatedDbResult.recentDeliveryMemory, 4)

    expect(capsule.recentGenres).toEqual(['article'])
    expect(capsule.recentContextKeys).toEqual(['Calibrating the Optical Sensor'])
    expect(capsule.recentResponseForms).toContain('organizer')
    expect(capsule.recentResponseForms).toContain('table:organizer')
    expect(capsule.recentResponseForms).toContain('sequence:horizontal')
    expect(capsule.recentDeliveryMemory).toHaveLength(1)
    expect(capsule.recentDeliveryMemory![0]?.snapshotId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(capsule.recentDeliveryMemory![0]?.weekNumber).toBe(3)
    expect(capsule.recentDeliveryMemory![0]?.readingHook).toBe('How sensors perceive light.')
    expect(capsule.recentDeliveryMemory![0]?.readingEntities).toEqual(['optical sensor', 'photodiode'])
    expect(capsule.recentDeliveryMemory![0]?.grammarTargets).toEqual(['g7-past-simple-irregular'])
  })
})


import { describe, expect, it } from 'vitest'
import { chooseOwnedChild, type ChildWithProfile } from '../hooks/use-parent-data'
import { findNextFutureJobReleaseAt, readGenerationSummary } from './materials'

const child = (id: string): ChildWithProfile => ({
  id,
  display_name: id,
  grade: 7, grade_stage: 'grade_7',
  is_active: true,
  timezone: 'Asia/Taipei',
  delivery_weekday: 1,
  textbook_version: null,
  next_generation_at: null,
  created_at: '2026-08-12T00:00:00Z',
  profile: null,
})

describe('chooseOwnedChild', () => {
  it('accepts only a child present in the owned collection', () => {
    const children = [child('first'), child('second')]
    expect(chooseOwnedChild(children, 'second')?.id).toBe('second')
    expect(chooseOwnedChild(children, 'not-owned')?.id).toBe('first')
  })

  it('returns null when the parent has no children', () => {
    expect(chooseOwnedChild([], 'anything')).toBeNull()
  })
})

describe('findNextFutureJobReleaseAt', () => {
  it('strictly selects the earliest future job relative to now among past, next, and later jobs', () => {
    const now = new Date('2026-08-14T00:00:00Z')
    const jobs = [
      { release_at: '2026-08-05T01:00:00Z' }, // Past (Week 0 / legacy)
      { release_at: '2026-08-12T01:00:00Z' }, // Past (Week 1)
      { release_at: '2026-08-26T01:00:00Z' }, // Later future (Week 3)
      { release_at: '2026-08-19T01:00:00Z' }, // Immediate next future (Week 2)
      { release_at: '2026-09-02T01:00:00Z' }, // Far future (Week 4)
    ]

    const selected = findNextFutureJobReleaseAt(jobs, now)
    expect(selected).toBe('2026-08-19T01:00:00Z')
  })

  it('returns null when all owned jobs are in the past', () => {
    const now = new Date('2026-08-20T00:00:00Z')
    const jobs = [
      { release_at: '2026-08-12T01:00:00Z' },
      { release_at: '2026-08-19T01:00:00Z' },
    ]

    const selected = findNextFutureJobReleaseAt(jobs, now)
    expect(selected).toBeNull()
  })
})

describe('readGenerationSummary', () => {
  it('treats parentSummary.personalizationZh as the canonical personalization contract', () => {
    const summary = {
      title: 'Robotics Challenge',
      parentSummary: {
        focusZh: '因果推論與 do / does',
        observeZh: ['是否能找出證據'],
        completionCheckZh: '核對答案即可',
        personalizationZh: [
          '依據上週回饋，提升閱讀篇幅並加入完整中文策略示範',
          '保留 do / does 複習題確認第三人稱單數動詞掌握度',
        ],
      },
      // Projection/compatibility fields that should NOT override canonical contract
      improvementComparedToPrevious: ['舊版投影欄位'],
      learningAdjustmentSummary: '舊版摘要字串',
    }

    const result = readGenerationSummary(summary, 2)
    expect(result.learningFocus).toBe('因果推論與 do / does')
    expect(result.personalizationReasons).toEqual([
      '依據上週回饋，提升閱讀篇幅並加入完整中文策略示範',
      '保留 do / does 複習題確認第三人稱單數動詞掌握度',
    ])
    expect(result.learningAdjustmentSummary).toBe(
      '依據上週回饋，提升閱讀篇幅並加入完整中文策略示範；保留 do / does 複習題確認第三人稱單數動詞掌握度'
    )
  })

  it('keeps meaningful strings and rejects unknown values', () => {
    expect(readGenerationSummary({ title: 'Ocean Week', learningFocus: 42, learningAdjustmentSummary: '加強閱讀篇幅' })).toEqual({
      title: 'Ocean Week',
      learningFocus: null,
      learningAdjustmentSummary: '加強閱讀篇幅',
      personalizationReasons: ['加強閱讀篇幅'],
    })
  })

  it('prioritizes explicit personalizationReasons contract from generation output', () => {
    const summary = {
      title: 'Science Project',
      personalizationReasons: [
        '依據上週回饋，保留 do / does 複習題確認第三人稱單數動詞用法',
        '提升閱讀推論深度，並提供中文策略示範',
      ],
      learningFocus: '推論證據與 do / does',
    }

    const result = readGenerationSummary(summary, 2)
    expect(result.personalizationReasons).toEqual([
      '依據上週回饋，保留 do / does 複習題確認第三人稱單數動詞用法',
      '提升閱讀推論深度，並提供中文策略示範',
    ])
    expect(result.learningFocus).toBe('推論證據與 do / does')
  })

  it('extracts structured personalization reasons from clean fallback summary output', () => {
    const summary = {
      title: 'One Change at a Time',
      improvementComparedToPrevious: ['本週加入中文策略示範，並將推論題改為有證據可回查的題型。'],
      feedbackApplied: ['提升閱讀篇幅與推論深度', '加入完整中文解說'],
      personalizationStrategy: '以機器人實驗承載推論與證據練習，沒有降低語言難度。',
    }

    const result = readGenerationSummary(summary, 2)
    expect(result.personalizationReasons).toHaveLength(4)
    expect(result.personalizationReasons[0]).toContain('中文策略示範')
    expect(result.personalizationReasons[1]).toContain('提升閱讀篇幅')
  })

  it('filters raw English LLM rationale / prompt traces from parent output', () => {
    const rawEnglishRationale = 'Kobe is beginning Grade 7 with developing reading skills and needs support for present simple questions.'
    const result = readGenerationSummary({
      title: 'Science Project',
      learningAdjustmentSummary: rawEnglishRationale,
    }, 2)

    // Raw English generation rationale must not be surfaced directly to parents
    expect(result.learningAdjustmentSummary).toBeNull()
    expect(result.personalizationReasons).toHaveLength(0)
  })

  it('filters out forbidden internal engine jargon and replaces with clean parent-friendly copy', () => {
    const leakedJargonSummary = {
      title: 'Smart Rooms, Small Changes',
      learningFocus: '推論證據與現在式問句',
      personalizationReasons: [
        'Week 1 無前一份 production packet 可比較；本週建立閱讀取證、字彙提取與因果產出的可觀察基線，供下一週依實際回饋調整。',
        '本週沒有前週回饋；依 feedback-missing 規則採保守校準，不把 silence 當 mastery。',
      ],
      improvementComparedToPrevious: [
        'Week 1 沒有上一份教材可比較；本週建立可量測基準：同一目標跨 guided、independent、CAP、production、retrieval 與 homework 留下提示前後證據。',
      ],
      learningAdjustmentSummary: '本輪為 Week 1 且 feedbackMissing=true；沒有把沉默視為掌握，依學習資料與學校進度採保守校準。',
    }

    // For Week 1: forbidden jargon is stripped, and clean parent calibration explanation is provided
    const resultWeek1 = readGenerationSummary(leakedJargonSummary, 1)
    expect(resultWeek1.personalizationReasons).toHaveLength(1)
    expect(resultWeek1.personalizationReasons[0]).toBe('這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。')
    expect(resultWeek1.learningAdjustmentSummary).toBe('這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。')
    expect(resultWeek1.learningAdjustmentSummary).not.toContain('production packet')
    expect(resultWeek1.learningAdjustmentSummary).not.toContain('feedbackMissing')
    expect(resultWeek1.learningAdjustmentSummary).not.toContain('silence')
    expect(resultWeek1.learningAdjustmentSummary).not.toContain('可觀察基線')

    // For later weeks: forbidden jargon is stripped and replaced with topic-focused parent explanation
    const resultWeek2 = readGenerationSummary(leakedJargonSummary, 2)
    expect(resultWeek2.personalizationReasons[0]).toBe('本週重點加強推論證據與現在式問句，透過生活化情境與循序練習幫助孩子掌握。')
  })

  it('provides Week 1 calibration fallback when specific reasons are absent', () => {
    const result = readGenerationSummary({
      title: 'The Rooftop Garden Challenge',
    }, 1)

    expect(result.learningAdjustmentSummary).toContain('第一週教材')
    expect(result.personalizationReasons[0]).toContain('第一週教材')
  })
})

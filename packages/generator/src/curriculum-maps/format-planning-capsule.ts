import { compareDeliveryRecency, type DeliveryMemoryProjection } from './delivery-memory.js'

export interface FormatPlanningCapsule {
  recentFormatUse: Record<string, number>
  recentReasoning: string[]
  avoidMechanicalRepeat: string[]
  availableButRecentlyUnused: string[]
}

export const CANONICAL_PEDAGOGICAL_FORMAT_CANDIDATES = [
  'table:organizer',
  'table:grid',
  'sequence:vertical',
  'sequence:horizontal',
  'comparison_matrix',
  'evidence_inference',
  'cause_chain',
  'sort_classify_grid',
  'before_after_table',
  'turning_point_sequence',
  'written:lines',
  'mcq:4-option',
] as const

export const FORMAT_SELECTION_RULES = [
  {
    learningTask: '時間／事件順序',
    preferredFormat: 'timeline / sequence',
    canonicalLayout: 'sequence',
    pedagogicalFormat: 'sequence:vertical',
    formatKey: 'timeline_sequence',
  },
  {
    learningTask: '步驟與創作歷程',
    preferredFormat: 'process sequence',
    canonicalLayout: 'sequence',
    pedagogicalFormat: 'sequence:vertical',
    formatKey: 'process_sequence',
  },
  {
    learningTask: '比較兩個選項、版本或角色',
    preferredFormat: 'comparison matrix',
    canonicalLayout: 'table',
    pedagogicalFormat: 'table:grid',
    formatKey: 'comparison_matrix',
  },
  {
    learningTask: '從文本證據得到結論',
    preferredFormat: 'evidence → inference organizer',
    canonicalLayout: 'organizer',
    pedagogicalFormat: 'table:organizer',
    formatKey: 'evidence_inference',
  },
  {
    learningTask: '原因、事件、結果',
    preferredFormat: 'cause chain',
    canonicalLayout: 'sequence',
    pedagogicalFormat: 'sequence:vertical',
    formatKey: 'cause_chain',
  },
  {
    learningTask: '分辨類型或特徵',
    preferredFormat: 'sort / classify grid',
    canonicalLayout: 'table',
    pedagogicalFormat: 'table:grid',
    formatKey: 'sort_classify_grid',
  },
  {
    learningTask: '修改前後的差異',
    preferredFormat: 'before / after table',
    canonicalLayout: 'table',
    pedagogicalFormat: 'table:grid',
    formatKey: 'before_after_table',
  },
  {
    learningTask: '整理人物成長、角色抉擇',
    preferredFormat: 'turning-point sequence',
    canonicalLayout: 'sequence',
    pedagogicalFormat: 'sequence:vertical',
    formatKey: 'turning_point_sequence',
  },
  {
    learningTask: '自由表達、句型產出',
    preferredFormat: 'structured lines',
    canonicalLayout: 'lines',
    pedagogicalFormat: 'written:lines',
    formatKey: 'written_lines',
  },
] as const

/**
 * Builds a deterministic FormatPlanningCapsule from recent delivery memory (e.g. last 2-4 weeks).
 *
 * Minimalist, deterministic extraction:
 * - recentFormatUse: count of times each format was used across recent delivered weeks
 * - recentReasoning: distinct reasoning operations observed recently
 * - avoidMechanicalRepeat: formats used heavily or consecutively (e.g. >= 2 weeks in window)
 * - availableButRecentlyUnused: pedagogical formats with 0 recent uses, offered as recommendation signals
 */
export function buildFormatPlanningCapsule(
  recentDeliveryMemory: DeliveryMemoryProjection[] = [],
  lookbackWeeks: number = 4,
): FormatPlanningCapsule {
  const recentSlice = [...recentDeliveryMemory].sort(compareDeliveryRecency).slice(0, Math.max(0, lookbackWeeks))

  const recentFormatUse: Record<string, number> = {}
  const recentReasoningSet = new Set<string>()

  for (const delivery of recentSlice) {
    // Count formats from pedagogicalFormats
    const formatsSeenThisDelivery = new Set<string>()
    for (const fmt of delivery.pedagogicalFormats ?? []) {
      if (fmt && !fmt.startsWith('itemType:')) {
        formatsSeenThisDelivery.add(fmt)
      }
    }

    // Also include responseLayoutTypes if not already counted
    for (const layout of delivery.responseLayoutTypes ?? []) {
      if (layout === 'organizer' && !formatsSeenThisDelivery.has('table:organizer')) {
        formatsSeenThisDelivery.add('table:organizer')
      } else if (layout === 'table' && !formatsSeenThisDelivery.has('table:grid') && !formatsSeenThisDelivery.has('table:organizer')) {
        formatsSeenThisDelivery.add('table:grid')
      } else if (layout === 'lines' && !formatsSeenThisDelivery.has('written:lines')) {
        formatsSeenThisDelivery.add('written:lines')
      }
    }

    for (const fmt of formatsSeenThisDelivery) {
      recentFormatUse[fmt] = (recentFormatUse[fmt] ?? 0) + 1
    }

    // Collect reasoning operations
    for (const op of delivery.reasoningOperations ?? []) {
      if (op) recentReasoningSet.add(op)
    }
  }

  // Identify formats to avoid mechanical repeating (used >= 2 times in window)
  const avoidMechanicalRepeat: string[] = []
  for (const [fmt, count] of Object.entries(recentFormatUse)) {
    if (count >= 2) {
      avoidMechanicalRepeat.push(fmt)
    }
  }
  avoidMechanicalRepeat.sort()

  // Identify available candidate formats with 0 recent use
  const availableButRecentlyUnused: string[] = []
  for (const candidate of CANONICAL_PEDAGOGICAL_FORMAT_CANDIDATES) {
    if (!recentFormatUse[candidate]) {
      availableButRecentlyUnused.push(candidate)
    }
  }

  // Also include domain-specific format keys from FORMAT_SELECTION_RULES if unused
  for (const rule of FORMAT_SELECTION_RULES) {
    if (!recentFormatUse[rule.pedagogicalFormat] && !recentFormatUse[rule.formatKey] && !availableButRecentlyUnused.includes(rule.formatKey)) {
      availableButRecentlyUnused.push(rule.formatKey)
    }
  }
  availableButRecentlyUnused.sort()

  return {
    recentFormatUse,
    recentReasoning: Array.from(recentReasoningSet).sort(),
    avoidMechanicalRepeat,
    availableButRecentlyUnused,
  }
}

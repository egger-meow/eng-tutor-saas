/**
 * Deterministic Learner Evidence Resolver
 * Policy: assessment-evidence-v1
 *
 * Integrates:
 * 1. Recent demonstrated weekly learning evidence (highest precedence)
 * 2. Direct Assessment compact evidence (secondary diagnostic evidence)
 * 3. Parent-reported starting level (tertiary fallback context)
 *
 * Enforces:
 * - Rule A: Demonstrated evidence beats parent self-report
 * - Rule B: Specific evidence beats broad domain assessment
 * - Rule C: Recent demonstrated weekly evidence supersedes older assessment evidence
 * - Rule D: Fresh high-confidence assessment beats parent self-report
 * - Rule E: Low-confidence assessment is advisory (confirm, not aggressive remediation)
 * - Rule F: Exposure is not weakness
 * - Snapshot boundary: Age and freshness are evaluated against cutoffTimestamp
 */

export const ASSESSMENT_EVIDENCE_POLICY_VERSION = 'assessment-evidence-v1' as const

export type AssessmentFreshness = 'fresh' | 'aging' | 'stale' | 'none'
export type DiagnosticLevel = 'needs_support' | 'developing' | 'secure'
export type DiagnosticConfidence = 'low' | 'medium' | 'high'
export type SignalSource = 'demonstrated' | 'assessment' | 'parent' | 'mixed'
export type SkillDirection = 'support' | 'confirm' | 'stretch'

export interface CompactDiagnosticSkill {
  level: DiagnosticLevel
  confidence: DiagnosticConfidence
}

export interface CompactDiagnosticDomain {
  level: DiagnosticLevel
  confidence: DiagnosticConfidence
}

export interface AssessmentEvidenceCapsule {
  projectionVersion: string
  assessedAt: string
  freshness?: AssessmentFreshness
  ageDays?: number
  skills: Record<string, CompactDiagnosticSkill>
  domains: Record<string, CompactDiagnosticDomain>
}

export interface ResolvedDomainSignal {
  level: DiagnosticLevel
  confidence: DiagnosticConfidence
  source: SignalSource
}

export interface ResolvedSkillSignal {
  skill: string
  canonicalCapSkill?: string
  domain: 'vocabulary' | 'grammar' | 'reading'
  level: DiagnosticLevel
  direction: SkillDirection
  confidence: DiagnosticConfidence
  source: SignalSource
  scaffoldGuidance?: string
}

export interface ResolvedEvidenceCapsule {
  policyVersion: typeof ASSESSMENT_EVIDENCE_POLICY_VERSION
  assessmentFreshness: AssessmentFreshness
  ageDays: number | null
  signals: {
    vocabulary: ResolvedDomainSignal
    grammar: ResolvedDomainSignal
    reading: ResolvedDomainSignal
  }
  prioritySkills: ResolvedSkillSignal[]
  scaffoldEmphasis: 'supported' | 'on-level' | 'stretch'
  guidanceSummary: string[]
}

/**
 * Mapping from Direct Assessment reading diagnostic skills to canonical CAP skills.
 * Vocabulary and grammar diagnostic skills calibrate burden and syntax scaffolding,
 * and are intentionally NOT mapped to fabricated curriculum target IDs.
 */
export const ASSESSMENT_READING_TO_CAP_SKILL_MAP: Record<string, string> = {
  explicit_information: 'explicit_detail',
  main_idea: 'main_idea',
  vocabulary_in_context: 'vocabulary_in_context',
  inference: 'local_inference',
  information_integration: 'information_integration',
}

export interface EvidenceResolverOptions {
  cutoffTimestamp?: string
}

/**
 * Normalizes parent profile level strings (e.g. 'beginner', 'intermediate', 'advanced', 'high')
 * into standard diagnostic levels.
 */
function normalizeProfileLevel(levelStr?: unknown): DiagnosticLevel {
  if (typeof levelStr !== 'string') return 'developing'
  const norm = levelStr.toLowerCase().trim()
  if (norm.includes('advanced') || norm.includes('secure') || norm.includes('high') || norm.includes('fluent')) {
    return 'secure'
  }
  if (norm.includes('beginner') || norm.includes('remedial') || norm.includes('low') || norm.includes('struggling') || norm.includes('support')) {
    return 'needs_support'
  }
  return 'developing'
}

/**
 * Resolves assessment freshness based on the immutable generation cutoff timestamp.
 */
export function calculateAssessmentFreshness(
  assessedAt?: string,
  cutoffTimestamp?: string,
): { freshness: AssessmentFreshness; ageDays: number | null } {
  if (!assessedAt) {
    return { freshness: 'none', ageDays: null }
  }

  const assessedMs = Date.parse(assessedAt)
  if (Number.isNaN(assessedMs)) {
    return { freshness: 'none', ageDays: null }
  }

  const cutoffMs = cutoffTimestamp ? Date.parse(cutoffTimestamp) : Date.now()
  const effectiveCutoff = Number.isNaN(cutoffMs) ? Date.now() : cutoffMs

  // If assessed after cutoff, it is out of snapshot boundary
  if (assessedMs > effectiveCutoff) {
    return { freshness: 'none', ageDays: null }
  }

  const ageDays = Math.max(0, Math.floor((effectiveCutoff - assessedMs) / (1000 * 60 * 60 * 24)))

  if (ageDays <= 90) {
    return { freshness: 'fresh', ageDays }
  }
  if (ageDays <= 180) {
    return { freshness: 'aging', ageDays }
  }
  return { freshness: 'stale', ageDays }
}

/**
 * Main deterministic evidence resolver.
 */
export function resolveLearnerEvidence(
  context: Record<string, unknown>,
  options?: EvidenceResolverOptions,
): ResolvedEvidenceCapsule {
  const cutoffTimestamp = options?.cutoffTimestamp ?? (typeof context.cutoffTimestamp === 'string' ? context.cutoffTimestamp : undefined)
  const profile = (context.profile ?? {}) as Record<string, unknown>
  const lifetime = (context.lifetimeLearningMemory ?? {}) as Record<string, any>
  const rawOlderEvidence = Array.isArray(context.targetedOlderEvidence) ? context.targetedOlderEvidence : []
  const assessmentEvidence = (context.assessmentEvidence ?? null) as AssessmentEvidenceCapsule | null

  // 1. Calculate Assessment Freshness
  const { freshness, ageDays } = calculateAssessmentFreshness(
    assessmentEvidence?.assessedAt,
    cutoffTimestamp,
  )

  const assessedTime = (assessmentEvidence?.assessedAt && freshness !== 'none')
    ? Date.parse(assessmentEvidence.assessedAt)
    : NaN
  const hasAssessment = !Number.isNaN(assessedTime)

  // 2. Parse Demonstrated Weekly Evidence
  const vocabWeakIds = new Set<string>(Array.isArray(lifetime.vocabulary?.verifiedWeakTargetIds) ? lifetime.vocabulary.verifiedWeakTargetIds : [])
  const vocabDueIds = new Set<string>(Array.isArray(lifetime.vocabulary?.dueTargetIds) ? lifetime.vocabulary.dueTargetIds : [])
  const grammarWeakIds = new Set<string>(Array.isArray(lifetime.grammar?.verifiedWeakTargetIds) ? lifetime.grammar.verifiedWeakTargetIds : [])
  const grammarDueIds = new Set<string>(Array.isArray(lifetime.grammar?.dueTargetIds) ? lifetime.grammar.dueTargetIds : [])

  // Check recent older evidence for specific skill performance
  const cutoffTime = cutoffTimestamp ? Date.parse(cutoffTimestamp) : Infinity
  const validOlderEvidence = rawOlderEvidence.filter((e: any) => {
    if (!e || typeof e !== 'object') return false
    if (typeof e.observedAt === 'string') {
      const t = Date.parse(e.observedAt)
      if (!Number.isNaN(t) && t > cutoffTime) return false
    }
    return true
  })

  // Distinguish evidence observed after assessment vs general evidence
  // For conflict-resolution against assessment:
  // observedAt > assessmentEvidence.assessedAt AND observedAt <= cutoffTimestamp
  const postAssessmentEvidence = validOlderEvidence.filter((e: any) => {
    if (!hasAssessment) return false
    if (typeof e.observedAt !== 'string') return false
    const t = Date.parse(e.observedAt)
    return !Number.isNaN(t) && t > assessedTime && t <= cutoffTime
  })

  // Post-assessment counts for conflict resolution against assessment
  const postAssessmentSkillSuccessCount: Record<string, number> = {}
  const postAssessmentSkillFailureCount: Record<string, number> = {}

  for (const item of postAssessmentEvidence) {
    const id = String(item.targetId ?? item.targetSkill ?? '')
    if (!id) continue
    const res = item.result
    if (res === 'correct' || res === 'mastered') {
      postAssessmentSkillSuccessCount[id] = (postAssessmentSkillSuccessCount[id] ?? 0) + 1
    } else if (res === 'incorrect' || res === 'partial' || res === 'struggled') {
      postAssessmentSkillFailureCount[id] = (postAssessmentSkillFailureCount[id] ?? 0) + 1
    }
  }

  // General counts for when no assessment exists
  const generalSkillSuccessCount: Record<string, number> = {}
  const generalSkillFailureCount: Record<string, number> = {}

  for (const item of validOlderEvidence) {
    const id = String(item.targetId ?? item.targetSkill ?? '')
    if (!id) continue
    const res = item.result
    if (res === 'correct' || res === 'mastered') {
      generalSkillSuccessCount[id] = (generalSkillSuccessCount[id] ?? 0) + 1
    } else if (res === 'incorrect' || res === 'partial' || res === 'struggled') {
      generalSkillFailureCount[id] = (generalSkillFailureCount[id] ?? 0) + 1
    }
  }

  // 3. Resolve Domain Signals
  // Default to parent-reported levels
  const parentVocabLevel = normalizeProfileLevel(profile.vocabulary_level ?? profile.baseline_level)
  const parentGrammarLevel = normalizeProfileLevel(profile.grammar_level ?? profile.baseline_level)
  const parentReadingLevel = normalizeProfileLevel(profile.reading_level ?? profile.baseline_level)

  const signals: ResolvedEvidenceCapsule['signals'] = {
    vocabulary: { level: parentVocabLevel, confidence: 'medium', source: 'parent' },
    grammar: { level: parentGrammarLevel, confidence: 'medium', source: 'parent' },
    reading: { level: parentReadingLevel, confidence: 'medium', source: 'parent' },
  }

  const guidanceSummary: string[] = []

  // Resolve Vocabulary Domain
  if (vocabWeakIds.size > 0) {
    // Rule A & B: Specific demonstrated weakness wins
    signals.vocabulary = {
      level: 'needs_support',
      confidence: 'high',
      source: 'demonstrated',
    }
    guidanceSummary.push(`Vocabulary has ${vocabWeakIds.size} verified weak targets from weekly learning.`)
  } else if (assessmentEvidence && freshness !== 'stale' && freshness !== 'none') {
    const dom = assessmentEvidence.domains?.vocabulary
    if (dom) {
      if (freshness === 'fresh') {
        signals.vocabulary = {
          level: dom.level,
          confidence: dom.confidence,
          source: 'assessment',
        }
      } else {
        // Aging assessment: softer influence
        signals.vocabulary = {
          level: dom.level,
          confidence: dom.confidence === 'high' ? 'medium' : 'low',
          source: 'assessment',
        }
      }
    }
  }

  // Resolve Grammar Domain
  if (grammarWeakIds.size > 0) {
    // Rule A & B: Specific demonstrated weakness wins over broad assessment
    if (assessmentEvidence?.domains?.grammar?.level === 'secure' && freshness === 'fresh') {
      signals.grammar = {
        level: 'developing',
        confidence: 'high',
        source: 'mixed',
      }
      guidanceSummary.push(`Grammar shows broad assessment strength, but ${grammarWeakIds.size} specific verified weaknesses require continued targeting.`)
    } else {
      signals.grammar = {
        level: 'needs_support',
        confidence: 'high',
        source: 'demonstrated',
      }
      guidanceSummary.push(`Grammar has ${grammarWeakIds.size} verified weak targets from weekly learning.`)
    }
  } else if (assessmentEvidence && freshness !== 'stale' && freshness !== 'none') {
    const dom = assessmentEvidence.domains?.grammar
    if (dom) {
      if (freshness === 'fresh') {
        signals.grammar = {
          level: dom.level,
          confidence: dom.confidence,
          source: 'assessment',
        }
      } else {
        signals.grammar = {
          level: dom.level,
          confidence: dom.confidence === 'high' ? 'medium' : 'low',
          source: 'assessment',
        }
      }
    }
  }

  // Resolve Reading Domain
  // Active reading evidence counts: when assessment exists, use post-assessment demonstrated observations
  // When no assessment exists, existing history behavior remains unchanged
  const activeReadingSuccessCount = hasAssessment ? postAssessmentSkillSuccessCount : generalSkillSuccessCount
  const activeReadingFailureCount = hasAssessment ? postAssessmentSkillFailureCount : generalSkillFailureCount

  const readingSuccesses = Object.entries(activeReadingSuccessCount).filter(([k]) =>
    ['reading', 'inference', 'detail', 'explicit_detail', 'main_idea', 'local_inference', 'information_integration'].some(s => k.includes(s)),
  ).reduce((acc, [, v]) => acc + v, 0)

  const readingFailures = Object.entries(activeReadingFailureCount).filter(([k]) =>
    ['reading', 'inference', 'detail', 'explicit_detail', 'main_idea', 'local_inference', 'information_integration'].some(s => k.includes(s)),
  ).reduce((acc, [, v]) => acc + v, 0)

  if (readingFailures > 0 && readingFailures >= readingSuccesses) {
    // Demonstrated weekly reading struggles (newer demonstrated failure beats assessment)
    signals.reading = {
      level: 'needs_support',
      confidence: 'high',
      source: 'demonstrated',
    }
    guidanceSummary.push('Reading comprehension shows recent demonstrated struggles in weekly learning.')
  } else if (hasAssessment && readingSuccesses >= 2 && readingFailures === 0 && assessmentEvidence?.domains?.reading?.level === 'needs_support') {
    // Rule C: Newer demonstrated weekly evidence supersedes older assessment weakness
    signals.reading = {
      level: 'developing',
      confidence: 'medium',
      source: 'demonstrated',
    }
    guidanceSummary.push('Recent demonstrated weekly successes have superseded older assessment reading weakness.')
  } else if (assessmentEvidence && freshness !== 'stale' && freshness !== 'none') {
    const dom = assessmentEvidence.domains?.reading
    if (dom) {
      if (freshness === 'fresh') {
        // Rule D: Fresh high/medium confidence assessment beats parent self-report
        signals.reading = {
          level: dom.level,
          confidence: dom.confidence,
          source: 'assessment',
        }
      } else {
        signals.reading = {
          level: dom.level,
          confidence: dom.confidence === 'high' ? 'medium' : 'low',
          source: 'assessment',
        }
      }
    }
  }

  // 4. Extract Priority Skills
  const prioritySkills: ResolvedSkillSignal[] = []

  if (assessmentEvidence && assessmentEvidence.skills && freshness !== 'stale' && freshness !== 'none') {
    for (const [skillKey, skillEval] of Object.entries(assessmentEvidence.skills)) {
      if (!skillEval || typeof skillEval !== 'object') continue

      const capSkill = ASSESSMENT_READING_TO_CAP_SKILL_MAP[skillKey]
      const domain: 'vocabulary' | 'grammar' | 'reading' = capSkill
        ? 'reading'
        : skillKey.includes('vocab') || skillKey === 'contextual_meaning' || skillKey === 'word_form_usage'
          ? 'vocabulary'
          : 'grammar'

      // Check Rule C: has newer weekly evidence superseded this assessment weakness?
      const capKey = capSkill ?? skillKey
      const postSuccesses = (postAssessmentSkillSuccessCount[capKey] ?? 0) + (capKey !== skillKey ? (postAssessmentSkillSuccessCount[skillKey] ?? 0) : 0)
      const postFailures = (postAssessmentSkillFailureCount[capKey] ?? 0) + (capKey !== skillKey ? (postAssessmentSkillFailureCount[skillKey] ?? 0) : 0)

      if (skillEval.level === 'needs_support') {
        if (postSuccesses >= 2 && postFailures === 0) {
          // Rule C applies: Newer weekly success supersedes older assessment weakness!
          continue
        }

        // Rule E: Low confidence is advisory confirmation
        if (skillEval.confidence === 'low') {
          prioritySkills.push({
            skill: skillKey,
            canonicalCapSkill: capSkill,
            domain,
            level: 'needs_support',
            direction: 'confirm',
            confidence: 'low',
            source: 'assessment',
            scaffoldGuidance: 'Advisory diagnostic signal; provide a gentle confirmation opportunity without aggressive remediation.',
          })
        } else {
          prioritySkills.push({
            skill: skillKey,
            canonicalCapSkill: capSkill,
            domain,
            level: 'needs_support',
            direction: 'support',
            confidence: skillEval.confidence,
            source: 'assessment',
            scaffoldGuidance: `Diagnostic weakness (${skillEval.confidence} confidence); provide targeted scaffolding and structured support.`,
          })
        }
      } else if (skillEval.level === 'developing') {
        if (skillEval.confidence === 'high' || skillEval.confidence === 'medium') {
          prioritySkills.push({
            skill: skillKey,
            canonicalCapSkill: capSkill,
            domain,
            level: 'developing',
            direction: 'confirm',
            confidence: skillEval.confidence,
            source: 'assessment',
            scaffoldGuidance: 'Developing skill; confirm competency with on-level practice.',
          })
        }
      } else if (skillEval.level === 'secure' && skillEval.confidence === 'high') {
        // If there are post-assessment demonstrated failures on this skill, demonstrated weakness wins
        if (postFailures > 0) {
          prioritySkills.push({
            skill: skillKey,
            canonicalCapSkill: capSkill,
            domain,
            level: 'needs_support',
            direction: 'support',
            confidence: 'high',
            source: 'demonstrated',
            scaffoldGuidance: 'Demonstrated recent struggle on this target supersedes prior assessment strength; provide targeted scaffolding.',
          })
        } else {
          prioritySkills.push({
            skill: skillKey,
            canonicalCapSkill: capSkill,
            domain,
            level: 'secure',
            direction: 'stretch',
            confidence: 'high',
            source: 'assessment',
            scaffoldGuidance: signals[domain].level === 'secure'
              ? 'Demonstrated area of strength; permits stretch opportunities.'
              : 'Demonstrated area of strength within developing domain; permits stretch opportunities.',
          })
        }
      }
    }
  }

  // Deterministically sort and cap priority skills to max 8 entries
  prioritySkills.sort((a, b) => {
    // 1. Direction: support first, then confirm, then stretch
    const dirOrder: Record<SkillDirection, number> = { support: 0, confirm: 1, stretch: 2 }
    if (dirOrder[a.direction] !== dirOrder[b.direction]) {
      return dirOrder[a.direction] - dirOrder[b.direction]
    }
    // 2. Confidence: high first, then medium, then low
    const confOrder: Record<DiagnosticConfidence, number> = { high: 0, medium: 1, low: 2 }
    if (confOrder[a.confidence] !== confOrder[b.confidence]) {
      return confOrder[a.confidence] - confOrder[b.confidence]
    }
    // 3. Alphabetical skill name tie-breaker
    return a.skill.localeCompare(b.skill)
  })

  const cappedPrioritySkills = prioritySkills.slice(0, 8)

  // 5. Global Scaffold Emphasis
  let scaffoldEmphasis: ResolvedEvidenceCapsule['scaffoldEmphasis'] = 'on-level'
  if (
    signals.reading.level === 'needs_support' ||
    signals.grammar.level === 'needs_support' ||
    cappedPrioritySkills.some(s => s.direction === 'support' && s.confidence === 'high')
  ) {
    scaffoldEmphasis = 'supported'
  } else if (
    signals.reading.level === 'secure' &&
    signals.grammar.level === 'secure' &&
    signals.vocabulary.level === 'secure'
  ) {
    scaffoldEmphasis = 'stretch'
  }

  if (freshness === 'stale') {
    guidanceSummary.push('Direct Assessment is older than 180 days (stale); treated as historical context and does not override demonstrated weekly performance or current profile.')
  }

  return {
    policyVersion: ASSESSMENT_EVIDENCE_POLICY_VERSION,
    assessmentFreshness: freshness,
    ageDays,
    signals,
    prioritySkills: cappedPrioritySkills,
    scaffoldEmphasis,
    guidanceSummary,
  }
}

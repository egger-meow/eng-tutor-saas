import {
  ASSESSMENT_DOMAINS,
  ASSESSMENT_SKILLS,
  DOMAIN_SKILLS_MAP,
  SKILL_TO_DOMAIN_MAP,
  type AssessmentDomain,
  type AssessmentSessionResult,
  type AssessmentSkill,
  type ConfidenceLevel,
  type DomainSummary,
  type SkillEvaluation,
  type SkillResult,
} from '../contracts.js'
import type { SkillEvidence } from './types.js'

export function evaluateSingleSkill(evidence?: SkillEvidence): SkillEvaluation {
  if (!evidence || evidence.attempts === 0) {
    return {
      skill: evidence?.skill || 'core_vocabulary',
      domain: evidence?.domain || 'vocabulary',
      result: 'developing',
      confidence: 'low',
      itemsAttempted: 0,
      itemsCorrect: 0,
      estimatedDifficulty: 2,
      notes: '未施測題目，無足夠資料。',
    }
  }

  const { attempts, correct, skipped, difficulties, outcomes, hasContradiction, skill, domain } =
    evidence

  const correctRate = correct / attempts
  const correctDifficulties = difficulties.filter((_, i) => outcomes[i] === 'correct')
  const failedDifficulties = difficulties.filter(
    (_, i) => outcomes[i] === 'incorrect' || outcomes[i] === 'skipped'
  )

  const maxCorrectDiff = correctDifficulties.length > 0 ? Math.max(...correctDifficulties) : 0
  const minFailedDiff = failedDifficulties.length > 0 ? Math.min(...failedDifficulties) : 6

  let result: SkillResult = 'developing'
  let confidence: ConfidenceLevel = 'low'
  let estimatedDifficulty = 2

  if (attempts === 1) {
    confidence = 'low'
    const diff = difficulties[0]
    if (correct === 1) {
      if (diff >= 3) {
        result = 'secure'
        estimatedDifficulty = diff
      } else {
        result = 'developing'
        estimatedDifficulty = diff
      }
    } else {
      if (diff <= 2) {
        result = 'needs_support'
        estimatedDifficulty = Math.max(1, diff - 1)
      } else {
        result = 'developing'
        estimatedDifficulty = Math.max(1, diff - 1)
      }
    }
  } else {
    // 2 or more attempts
    if (hasContradiction) {
      confidence = attempts >= 4 ? 'medium' : 'low'
    } else if (attempts >= 3) {
      confidence = 'high'
    } else {
      confidence = 'medium'
    }

    if (correctRate >= 0.7) {
      if (maxCorrectDiff >= 3) {
        result = 'secure'
        estimatedDifficulty = maxCorrectDiff
      } else {
        result = 'developing'
        estimatedDifficulty = 2
      }
    } else if (correctRate <= 0.35 || (correct === 0 && minFailedDiff <= 2)) {
      result = 'needs_support'
      estimatedDifficulty = Math.max(1, Math.min(minFailedDiff, 2))
    } else {
      result = 'developing'
      const avgDiff = Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length)
      estimatedDifficulty = Math.max(1, Math.min(5, avgDiff))
    }
  }

  return {
    skill,
    domain,
    result,
    confidence,
    itemsAttempted: attempts,
    itemsCorrect: correct,
    estimatedDifficulty,
  }
}

const DOMAIN_FEEDBACK_TEXT: Record<AssessmentDomain, Record<SkillResult, string>> = {
  vocabulary: {
    secure: '字彙掌握穩固，常用單字辨析度佳。',
    developing: '常用字彙具備基礎，情境用法與延伸詞性需持續累積。',
    needs_support: '基礎核心字彙較為薄弱，建議從教育部常用千字加強扎根。',
  },
  grammar: {
    secure: '句型結構與時態掌握良好，能理解複合句與進階文法。',
    developing: '基礎句型結構穩定，時態一致性與關係子句仍需多練習。',
    needs_support: '基本五大句型與時態規則待強化，建議回歸基本句構練習。',
  },
  reading: {
    secure: '閱讀篇章理解力佳，能快速掌握主旨並進行深層推論。',
    developing: '能檢索篇章具體細節，長文推論與跨段落整合仍有進步空間。',
    needs_support: '文章細節擷取較為吃力，建議從短篇生活對話與公告開始建立信心。',
  },
}

export function evaluateDomainSummary(
  domain: AssessmentDomain,
  evaluations: SkillEvaluation[]
): DomainSummary {
  const domainEvals = evaluations.filter((e) => e.domain === domain)
  if (domainEvals.length === 0) {
    return {
      domain,
      result: 'developing',
      confidence: 'low',
      summaryZh: DOMAIN_FEEDBACK_TEXT[domain].developing,
    }
  }

  const secureCount = domainEvals.filter((e) => e.result === 'secure').length
  const needsSupportCount = domainEvals.filter((e) => e.result === 'needs_support').length

  let domainResult: SkillResult = 'developing'
  if (secureCount > domainEvals.length / 2) {
    domainResult = 'secure'
  } else if (needsSupportCount > domainEvals.length / 2) {
    domainResult = 'needs_support'
  }

  // Domain confidence
  const lowCount = domainEvals.filter((e) => e.confidence === 'low').length
  const highCount = domainEvals.filter((e) => e.confidence === 'high').length
  let domainConfidence: ConfidenceLevel = 'medium'
  if (highCount >= domainEvals.length - 1) {
    domainConfidence = 'high'
  } else if (lowCount > domainEvals.length / 2) {
    domainConfidence = 'low'
  }

  return {
    domain,
    result: domainResult,
    confidence: domainConfidence,
    summaryZh: DOMAIN_FEEDBACK_TEXT[domain][domainResult],
  }
}

export function generateOverallNarrative(
  summaries: Record<AssessmentDomain, DomainSummary>
): string {
  const v = summaries.vocabulary.result
  const g = summaries.grammar.result
  const r = summaries.reading.result

  if (v === 'secure' && g === 'secure' && r === 'secure') {
    return '整體英語程度穩健優異，字彙量充足且文法結構清晰，具備良好的篇章推論能力。'
  }
  if (v === 'needs_support' && g === 'needs_support' && r === 'needs_support') {
    return '目前在各學習領域均需要更多基礎引導，建議從日常核心字彙與簡單句構循序漸進建立學習自信。'
  }
  if (r === 'secure' && (g === 'developing' || g === 'needs_support')) {
    return '閱讀理解與語感表現良好，但文法規則與精準句構稍弱，加強時態與句型有助於突破瓶頸。'
  }
  if (g === 'secure' && (r === 'developing' || r === 'needs_support')) {
    return '文法概念清晰扎實，篇章閱讀時可多練習長文耐心與段落主旨掌握。'
  }
  return '整體英語學習基礎良好，各領域表現均衡，持續保持每週閱讀習慣將能穩定進步。'
}

export function buildFinalSessionResult(
  sessionId: string,
  childId: string,
  skillEvidenceMap: Record<AssessmentSkill, SkillEvidence>
): AssessmentSessionResult {
  const skillEvaluations = {} as Record<AssessmentSkill, SkillEvaluation>
  let totalAttempted = 0
  let totalCorrect = 0
  let totalSkipped = 0

  for (const skill of ASSESSMENT_SKILLS) {
    const evidence = skillEvidenceMap[skill]
    const evalResult = evaluateSingleSkill(evidence)
    skillEvaluations[skill] = evalResult

    if (evidence) {
      totalAttempted += evidence.attempts
      totalCorrect += evidence.correct
      totalSkipped += evidence.skipped
    }
  }

  const domainSummaries = {} as Record<AssessmentDomain, DomainSummary>
  for (const domain of ASSESSMENT_DOMAINS) {
    const evals = Object.values(skillEvaluations).filter((e) => e.domain === domain)
    domainSummaries[domain] = evaluateDomainSummary(domain, evals)
  }

  const overallNarrativeZh = generateOverallNarrative(domainSummaries)

  return {
    sessionId,
    childId,
    completedAt: new Date().toISOString(),
    totalItems: Math.max(1, totalAttempted),
    correctCount: totalCorrect,
    skipCount: totalSkipped,
    skillEvaluations,
    domainSummaries,
    overallNarrativeZh,
  }
}

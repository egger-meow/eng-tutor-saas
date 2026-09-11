import {
  ASSESSMENT_DOMAINS,
  ASSESSMENT_SKILLS,
  DOMAIN_SKILLS_MAP,
  SKILL_TO_DOMAIN_MAP,
  type AssessmentDomain,
  type AssessmentItem,
  type AssessmentPassage,
  type AssessmentSkill,
} from '../contracts.js'
import { normalizeShortAnswer } from './normalizer.js'

export interface BankCoverageReport {
  totalItems: number
  totalPassages: number
  domainCounts: Record<AssessmentDomain, number>
  skillCounts: Record<AssessmentSkill, number>
  difficultyCounts: Record<number, number>
  responseTypeCounts: Record<string, number>
  itemsPerPassage: Record<string, number>
}

export interface BankValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  coverage: BankCoverageReport
}

export function validateAssessmentBank(
  items: readonly AssessmentItem[],
  passages: readonly AssessmentPassage[]
): BankValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const itemIds = new Set<string>()
  const passageIds = new Set<string>()

  const domainCounts: Record<AssessmentDomain, number> = {
    vocabulary: 0,
    grammar: 0,
    reading: 0,
  }

  const skillCounts = Object.fromEntries(
    ASSESSMENT_SKILLS.map((s) => [s, 0])
  ) as Record<AssessmentSkill, number>

  const difficultyCounts: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }

  const responseTypeCounts: Record<string, number> = {
    single_choice: 0,
    short_answer: 0,
  }

  const itemsPerPassage: Record<string, number> = {}

  // 1. Passage Validation
  for (const p of passages) {
    if (!p.id || !p.id.trim()) {
      errors.push(`Passage missing ID: ${JSON.stringify(p)}`)
      continue
    }
    if (passageIds.has(p.id)) {
      errors.push(`Duplicate passage ID: ${p.id}`)
    }
    passageIds.add(p.id)
    itemsPerPassage[p.id] = 0

    if (!p.title || p.title.trim().length === 0) {
      errors.push(`Passage ${p.id} has empty title`)
    }
    if (!p.content || p.content.trim().length === 0) {
      errors.push(`Passage ${p.id} has empty content`)
    }
    if (!p.wordCount || p.wordCount <= 0) {
      errors.push(`Passage ${p.id} has invalid word count: ${p.wordCount}`)
    }
  }

  // 2. Item Validation
  for (const item of items) {
    if (!item.id || !item.id.trim()) {
      errors.push(`Item missing ID: ${JSON.stringify(item)}`)
      continue
    }
    if (itemIds.has(item.id)) {
      errors.push(`Duplicate item ID: ${item.id}`)
    }
    itemIds.add(item.id)

    // Domain & Skill validation
    if (!ASSESSMENT_DOMAINS.includes(item.domain)) {
      errors.push(`Item ${item.id} has invalid domain: ${item.domain}`)
    } else {
      domainCounts[item.domain]++
    }

    if (!ASSESSMENT_SKILLS.includes(item.skill)) {
      errors.push(`Item ${item.id} has invalid skill: ${item.skill}`)
    } else {
      skillCounts[item.skill]++
      // Domain-skill consistency check
      const expectedDomain = SKILL_TO_DOMAIN_MAP[item.skill]
      if (expectedDomain !== item.domain) {
        errors.push(
          `Item ${item.id} domain-skill mismatch: domain=${item.domain} expected=${expectedDomain} for skill=${item.skill}`
        )
      }
    }

    // Difficulty validation
    if (item.difficulty < 1 || item.difficulty > 5) {
      errors.push(`Item ${item.id} has out-of-range difficulty: ${item.difficulty}`)
    } else {
      difficultyCounts[item.difficulty] = (difficultyCounts[item.difficulty] || 0) + 1
    }

    // Response Type counts
    if (item.responseType === 'single_choice' || item.responseType === 'short_answer') {
      responseTypeCounts[item.responseType]++
    } else {
      errors.push(`Item ${item.id} has unknown responseType: ${item.responseType}`)
    }

    // Prompt check
    if (!item.prompt || item.prompt.trim().length === 0) {
      errors.push(`Item ${item.id} has empty prompt`)
    }

    // MCQ integrity
    if (item.responseType === 'single_choice') {
      if (!item.choices || !Array.isArray(item.choices) || item.choices.length < 2) {
        errors.push(`Item ${item.id} is single_choice but has fewer than 2 choices`)
      } else {
        const choiceIds = new Set<string>()
        const choiceTexts = new Set<string>()

        for (const c of item.choices) {
          if (!c.id || !c.id.trim()) {
            errors.push(`Item ${item.id} has choice with empty ID`)
          }
          if (choiceIds.has(c.id)) {
            errors.push(`Item ${item.id} has duplicate choice ID: ${c.id}`)
          }
          choiceIds.add(c.id)

          const trimmedText = c.text.trim().toLowerCase()
          if (!trimmedText) {
            errors.push(`Item ${item.id} has choice ${c.id} with empty text`)
          }
          if (choiceTexts.has(trimmedText)) {
            errors.push(`Item ${item.id} has duplicate visible choice text: "${c.text}"`)
          }
          choiceTexts.add(trimmedText)
        }

        if (!item.correctChoice) {
          errors.push(`Item ${item.id} is single_choice but lacks correctChoice`)
        } else if (!choiceIds.has(item.correctChoice)) {
          errors.push(
            `Item ${item.id} correctChoice "${item.correctChoice}" not found in choices [${Array.from(choiceIds).join(', ')}]`
          )
        }
      }

      if (item.acceptedAnswers && item.acceptedAnswers.length > 0) {
        errors.push(`Item ${item.id} is single_choice but specifies acceptedAnswers`)
      }
    }

    // Short-answer integrity
    if (item.responseType === 'short_answer') {
      if (
        !item.acceptedAnswers ||
        !Array.isArray(item.acceptedAnswers) ||
        item.acceptedAnswers.length === 0
      ) {
        errors.push(`Item ${item.id} is short_answer but has empty acceptedAnswers`)
      } else {
        const normalizedSet = new Set<string>()
        for (const ans of item.acceptedAnswers) {
          if (typeof ans !== 'string' || ans.trim().length === 0) {
            errors.push(`Item ${item.id} has non-string or empty accepted answer: ${JSON.stringify(ans)}`)
          } else {
            const norm = normalizeShortAnswer(ans)
            if (normalizedSet.has(norm)) {
              errors.push(`Item ${item.id} has redundant/colliding accepted answer: "${ans}" (normalized: "${norm}")`)
            }
            normalizedSet.add(norm)
          }
        }
      }

      if (item.choices && item.choices.length > 0) {
        errors.push(`Item ${item.id} is short_answer but defines choices`)
      }
      if (item.correctChoice) {
        errors.push(`Item ${item.id} is short_answer but defines correctChoice`)
      }
    }

    // Passage relationship
    if (item.domain === 'reading') {
      if (!item.passageId) {
        errors.push(`Reading item ${item.id} is missing passageId`)
      } else if (!passageIds.has(item.passageId)) {
        errors.push(`Reading item ${item.id} references non-existent passageId: ${item.passageId}`)
      } else {
        itemsPerPassage[item.passageId]++
      }
    } else {
      if (item.passageId) {
        errors.push(`Non-reading item ${item.id} (domain: ${item.domain}) should not have passageId`)
      }
    }
  }

  // 3. Minimum Material per Skill for Adaptive Routing (minimum 6 items per skill)
  for (const skill of ASSESSMENT_SKILLS) {
    const count = skillCounts[skill] || 0
    if (count < 6) {
      errors.push(`Skill "${skill}" has only ${count} items (minimum 6 required for adaptive routing)`)
    }
  }

  // 4. Passage Quality Bounds (2-4 items per passage)
  for (const [pId, count] of Object.entries(itemsPerPassage)) {
    if (count < 2 || count > 4) {
      warnings.push(`Passage "${pId}" has ${count} items (recommended bounds: 2-4 items per passage)`)
    }
  }

  const coverage: BankCoverageReport = {
    totalItems: items.length,
    totalPassages: passages.length,
    domainCounts,
    skillCounts,
    difficultyCounts,
    responseTypeCounts,
    itemsPerPassage,
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    coverage,
  }
}

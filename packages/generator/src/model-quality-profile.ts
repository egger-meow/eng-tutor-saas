import type { CurriculumPackage } from './curriculum-package-schema.js'
import {
  auditCurriculumPackage,
  type CurriculumAuditFinding,
} from './audit-curriculum.js'
import {
  findForbiddenPersonalizationJargon,
  validateCurriculumPackage,
} from './validate-curriculum-package.js'
import { normalizeCurriculumPackage } from './normalize-curriculum-package.js'
import {
  resolveQualityProfile,
  type QualityProfile,
} from './quality-profile-loader.js'
import type { LessonValidationIssue } from './validate-lesson.js'

import { CURRENT_ENGINE_VERSION } from './engine-version.js'

export interface ModelQualityProfileOptions {
  modelName?: string
  profilesDir?: string
  surgicalRepairHook?: (
    pkg: CurriculumPackage,
    profile: QualityProfile,
    findings: CurriculumAuditFinding[],
  ) => Promise<CurriculumPackage> | CurriculumPackage
  targetMinutes?: number
}

export interface ProfileProvenance {
  actualModel: string
  resolvedQualityProfile: string
  qualityProfileVersion: string
  engineVersion: string
  profileName: string
  profileVersion: string
  isFallback: boolean
  modelQueried: string
  activeRulesCount: number
  appliedRules: string[]
  repairedFields: string[]
}

export interface PreSubmitResult {
  success: boolean
  curriculumPackage?: CurriculumPackage
  provenance?: ProfileProvenance
  issues?: LessonValidationIssue[]
}

function auditFindingsToIssues(findings: CurriculumAuditFinding[]): LessonValidationIssue[] {
  return findings
    .filter((f) => f.severity === 'critical')
    .map((f) => ({
      path: `audit.${f.dimension}`,
      message: f.message,
    }))
}

/**
 * Performs deterministic semantic repairs based on active model rules.
 * Strictly preserves IDs, targets, fingerprints, and core structure.
 */
function performDeterministicSurgicalRepair(
  pkg: CurriculumPackage,
  profile: QualityProfile,
): string[] {
  const repairedFields: string[] = []

  const hasRule = (targetArea: string, idPrefix: string) =>
    profile.activeRules.some((r) => r.targetArea === targetArea || r.id.startsWith(idPrefix))

  // 1. Chinese Naturalness Pass (e.g. gemini-zh-03)
  if (hasRule('chinese-naturalness', 'gemini-zh') || hasRule('chinese-naturalness', 'zh')) {
    // Replace non-Taiwanese terminology if accidentally produced
    const fixChineseTerms = (text: string): { text: string; changed: boolean } => {
      let current = text
      let changed = false
      if (current.includes('初中')) {
        current = current.replace(/初中/g, '國中')
        changed = true
      }
      return { text: current, changed }
    }

    if (pkg.studentLesson.opening.howToUseZh) {
      const res = fixChineseTerms(pkg.studentLesson.opening.howToUseZh)
      if (res.changed) {
        pkg.studentLesson.opening.howToUseZh = res.text
        repairedFields.push('studentLesson.opening.howToUseZh')
      }
    }

    for (const item of pkg.studentLesson.vocabulary) {
      const res = fixChineseTerms(item.meaningZh)
      if (res.changed) {
        item.meaningZh = res.text
        repairedFields.push(`studentLesson.vocabulary.${item.id}.meaningZh`)
      }
    }

    for (const inst of pkg.studentLesson.instruction) {
      const res = fixChineseTerms(inst.explanationZh)
      if (res.changed) {
        inst.explanationZh = res.text
        repairedFields.push(`studentLesson.instruction.${inst.id}.explanationZh`)
      }
    }
  }

  // 2. Parent Personalization Cleanliness Check
  if (pkg.parentSummary.personalizationZh) {
    const cleanedReasons: string[] = []
    let modified = false
    for (const reason of pkg.parentSummary.personalizationZh) {
      const jargon = findForbiddenPersonalizationJargon(reason)
      if (jargon) {
        modified = true
      } else {
        cleanedReasons.push(reason)
      }
    }
    if (modified && cleanedReasons.length > 0) {
      pkg.parentSummary.personalizationZh = cleanedReasons
      repairedFields.push('parentSummary.personalizationZh')
    }
  }

  return repairedFields
}

/**
 * Pre-Submit Critic & Surgical Repair Layer
 *
 * Pipeline:
 * 1. Global Normalization & Validation (Schema & Rubric)
 * 2. Model Quality Profile Resolution (Exact model -> file or default.md fallback)
 * 3. Surgical Semantic Critic & Repair (Preserving IDs, targets, and fingerprint)
 * 4. Deterministic Validation (Fails closed on any schema/quality failure)
 * 5. Metadata Provenance Recording
 */
export async function applyModelQualityProfile(
  input: unknown,
  options?: ModelQualityProfileOptions,
): Promise<PreSubmitResult> {
  try {
    // 1. Initial Normalization & Global Validation
    const normalizedInput = normalizeCurriculumPackage(input)
    const initialValidation = validateCurriculumPackage(normalizedInput)
    if (!initialValidation.success) {
      return { success: false, issues: initialValidation.issues }
    }

    let pkg = initialValidation.curriculumPackage
    const initialAudit = auditCurriculumPackage(pkg, options?.targetMinutes)
    const workloadRepair = initialAudit.findings.some(
      (finding) => finding.severity === 'critical' && finding.dimension === 'workload-calibration',
    )
    if (!initialAudit.passed) {
      const criticalFindings = initialAudit.findings.filter((finding) => finding.severity === 'critical')
      const workloadOnly = criticalFindings.length > 0 && criticalFindings.every(
        (finding) => finding.dimension === 'workload-calibration',
      )
      if (!workloadOnly || !options?.surgicalRepairHook) {
        return { success: false, issues: auditFindingsToIssues(initialAudit.findings) }
      }
    }

    // 2. Model Quality Profile Resolution
    const modelQueried = options?.modelName ?? pkg.metadata.model ?? 'default'
    const profile = await resolveQualityProfile(modelQueried, options?.profilesDir)

    // Capture baseline structural invariants
    const originalTargetIds = pkg.learningPlan.targets.map((t) => t.id)
    const originalQuestionIds = [
      ...pkg.studentLesson.practice.flatMap((s) => s.questions.map((q) => q.id)),
      ...pkg.studentLesson.homework.questions.map((q) => q.id),
    ]
    const originalReadingBlocks = structuredClone(pkg.studentLesson.reading.blocks)
    const originalGrounding = 'grounding' in pkg ? structuredClone(pkg.grounding) : undefined
    const originalStages = pkg.studentLesson.practice.map((stage) => stage.stage)
    const originalFingerprint = pkg.metadata.inputFingerprint
    const originalJobId = pkg.metadata.jobId
    const originalChildId = pkg.metadata.childId
    const originalWeekNumber = pkg.metadata.weekNumber

    let repairedFields: string[] = []
    const appliedRules = profile.activeRules.map((r) => r.id)

    // 3. Surgical Repair
    if (profile.activeRules.length > 0) {
      repairedFields = performDeterministicSurgicalRepair(pkg, profile)
    }

    if (options?.surgicalRepairHook) {
      const customRepaired = await options.surgicalRepairHook(pkg, profile, initialAudit.findings)
      if (customRepaired && typeof customRepaired === 'object') {
        pkg = customRepaired
        repairedFields.push('customRepairHook')
      }
    }

    // 4. Invariant Assertion (Strict fail-closed checks)
    if (pkg.metadata.inputFingerprint !== originalFingerprint) {
      return {
        success: false,
        issues: [{ path: 'metadata.inputFingerprint', message: 'Surgical repair mutated inputFingerprint' }],
      }
    }
    if (
      pkg.metadata.jobId !== originalJobId ||
      pkg.metadata.childId !== originalChildId ||
      pkg.metadata.weekNumber !== originalWeekNumber
    ) {
      return {
        success: false,
        issues: [{ path: 'metadata', message: 'Surgical repair mutated core metadata identifiers' }],
      }
    }

    const currentTargetIds = pkg.learningPlan.targets.map((t) => t.id)
    if (
      currentTargetIds.length !== originalTargetIds.length ||
      !currentTargetIds.every((id, idx) => id === originalTargetIds[idx])
    ) {
      return {
        success: false,
        issues: [{ path: 'learningPlan.targets', message: 'Surgical repair corrupted learning targets' }],
      }
    }

    const currentQuestionIds = [
      ...pkg.studentLesson.practice.flatMap((s) => s.questions.map((q) => q.id)),
      ...pkg.studentLesson.homework.questions.map((q) => q.id),
    ]
    if (!workloadRepair && (
      currentQuestionIds.length !== originalQuestionIds.length ||
      !currentQuestionIds.every((id, idx) => id === originalQuestionIds[idx])
    )) {
      return {
        success: false,
        issues: [{ path: 'studentLesson.practice', message: 'Surgical repair corrupted question identifiers' }],
      }
    }

    if (JSON.stringify(pkg.studentLesson.reading.blocks) !== JSON.stringify(originalReadingBlocks)) {
      return {
        success: false,
        issues: [{ path: 'studentLesson.reading.blocks', message: 'Surgical repair mutated valid reading or grounding-dependent prose' }],
      }
    }

    if (workloadRepair && 'grounding' in pkg && JSON.stringify(pkg.grounding) !== JSON.stringify(originalGrounding)) {
      return { success: false, issues: [{ path: 'grounding', message: 'Workload repair mutated valid grounding' }] }
    }
    if (!originalStages.every((stage) => pkg.studentLesson.practice.some((current) => current.stage === stage))) {
      return { success: false, issues: [{ path: 'studentLesson.practice', message: 'Surgical repair deleted a required curriculum stage' }] }
    }
    // 5. Deterministic Validation on Final Output
    const finalValidation = validateCurriculumPackage(pkg)
    if (!finalValidation.success) {
      return { success: false, issues: finalValidation.issues }
    }
    pkg = finalValidation.curriculumPackage

    const finalAudit = auditCurriculumPackage(pkg, options?.targetMinutes)
    if (!finalAudit.passed) {
      return { success: false, issues: auditFindingsToIssues(finalAudit.findings) }
    }

    // 6. Record Provenance in Quality Evidence
    const profileCheckId = 'model-quality-profile'
    const checkIndex = pkg.qualityEvidence.criticalChecks.findIndex((c) => c.id === profileCheckId)
    const checkEvidence = `actualModel=${modelQueried} | resolvedQualityProfile=${profile.name} | qualityProfileVersion=${profile.version} | engineVersion=${CURRENT_ENGINE_VERSION}${profile.isFallback ? ' (fallback)' : ''}`

    if (checkIndex >= 0) {
      pkg.qualityEvidence.criticalChecks[checkIndex] = {
        id: profileCheckId,
        passed: true,
        evidence: checkEvidence,
      }
    } else {
      pkg.qualityEvidence.criticalChecks.push({
        id: profileCheckId,
        passed: true,
        evidence: checkEvidence,
      })
    }

    if (!pkg.metadata.engineVersion) {
      pkg.metadata.engineVersion = CURRENT_ENGINE_VERSION
    }

    const provenance: ProfileProvenance = {
      actualModel: modelQueried,
      resolvedQualityProfile: profile.name,
      qualityProfileVersion: profile.version,
      engineVersion: CURRENT_ENGINE_VERSION,
      profileName: profile.name,
      profileVersion: profile.version,
      isFallback: profile.isFallback,
      modelQueried,
      activeRulesCount: profile.activeRules.length,
      appliedRules,
      repairedFields,
    }

    return {
      success: true,
      curriculumPackage: pkg,
      provenance,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      issues: [{ path: 'applyModelQualityProfile', message: `Model quality profile evaluation failed: ${message}` }],
    }
  }
}

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'
import {
  CurriculumPackageSchema,
  CurriculumPackageV21Schema,
  CurriculumPackageV20Schema,
} from './curriculum-package-schema.js'

describe('Wave 2–4.1 Pedagogy & Contract Invariants', () => {
  it('enforces Trigger → Pattern → Trap → Try mental model without rigid template labels in author prompt', async () => {
    const authorPrompt = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.1.0/02-author.md'), 'utf8')

    expect(authorPrompt).toContain('Trigger → Pattern → Trap → Try')
    expect(authorPrompt).toContain('Do NOT mechanically copy-paste or expose the literal labels')
    expect(authorPrompt).toContain('commonMistakes')
  })

  it('enforces the student-reasoning distractor invariant in author and critic prompts', async () => {
    const authorPrompt = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.1.0/02-author.md'), 'utf8')
    const criticPrompt = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.1.0/03-critic.md'), 'utf8')

    expect(authorPrompt).toContain('What flawed student reasoning would lead them to choose this?')
    expect(authorPrompt).toContain('partial evidence')
    expect(authorPrompt).toContain('reversed relationship')
    expect(criticPrompt).toContain('Weak, Silly, or Unprincipled Distractors')
  })

  it('explicitly forbids tautological parent answer explanations', async () => {
    const authorPrompt = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.1.0/02-author.md'), 'utf8')
    const criticPrompt = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.1.0/03-critic.md'), 'utf8')

    expect(authorPrompt).toContain('Tautological explanations (e.g. 「答案 C，因為根據文章內容 C 正確」) are strictly forbidden.')
    expect(criticPrompt).toContain('Circular or Tautological Explanations')
    expect(authorPrompt).toContain('likelyMisconceptionZh')
  })

  it('preserves CurriculumPackageSchema 2.2.0 canonical, V21 legacy, and V20 legacy', () => {
    // Assert schema target domain enum includes communication in 2.2.0
    const targetDomainEnum = CurriculumPackageSchema.shape.learningPlan.shape.targets.element.shape.domain.options
    expect(targetDomainEnum).toEqual(['vocabulary', 'grammar', 'reading', 'writing', 'communication', 'review'])

    // Assert canonical schemaVersion is 2.2.0, legacy V21 is 2.1.0, legacy V20 is 2.0.0
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(true)
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.1.0').success).toBe(false)

    expect(CurriculumPackageV21Schema.shape.metadata.shape.schemaVersion.safeParse('2.1.0').success).toBe(true)
    expect(CurriculumPackageV21Schema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(false)

    expect(CurriculumPackageV20Schema.shape.metadata.shape.schemaVersion.safeParse('2.0.0').success).toBe(true)
    expect(CurriculumPackageV20Schema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(false)
  })

  it('enforces Prompt 2.4.0 Wave 4.1 CAP curriculum foundation, multi-genre, and trajectory diversity invariants', async () => {
    const plan240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/01-plan.md'), 'utf8')
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')
    const bundle = await readFile(resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md'), 'utf8')

    // Planning Priority & Target ➔ Genre Hierarchy
    expect(plan240).toContain('The Strict Planning Priority Order')
    expect(plan240).toContain('The Golden Hierarchy: Target ➔ Genre ➔ Interest')
    expect(plan240).toContain('Genre Alignment Matrix')

    // Exposure Invariant in Authoring
    expect(author240).toContain('Exposure is not evidence of mastery.')
    expect(author240).toContain('trackingDelta: Exposure Only (Schema 2.2.0)')
    expect(author240).toContain('Schema 2.2.0')

    // Bundle compiled with 2.4.0
    expect(bundle).toContain('bundleVersion: "2.4.0-prod"')
    expect(bundle).toContain('schemaVersion: "2.2.0"')
  })

  it('enforces Prompt 2.2.0 low-model authoring scaffolds (few-shot, local Q&A, evidence recipes)', async () => {
    const plan220 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.2.0/01-plan.md'), 'utf8')
    const author220 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.2.0/02-author.md'), 'utf8')

    // Simple Target Evidence Recipes
    expect(plan220).toContain('Minimum Target Evidence Recipes')
    expect(plan220).toContain('guided attempt ➔ independent attempt ➔ one later retrieval / homework check')
    expect(plan220).toContain('independent detail/inference attempt ➔ CAP-transfer application')

    // Micro Contrastive Few-Shot
    expect(author220).toContain('Micro Contrastive Few-Shot (BAD ➔ GOOD)')
    expect(author220).toContain('Mina has lived here _____ 2024.')
    expect(author220).toContain('Why did the team change its plan?')
    expect(author220).toContain('unsupported reasonable inference')

    // Local Q&A Authoring Protocol
    expect(author220).toContain('Local Question-Answer Authoring Protocol')
    expect(author220).toContain('Local Thought Sequencing')
    expect(author220).toContain('Deterministic Projection')

    // Server-Side Deterministic Normalization Notice
    expect(author220).toContain('Server-Side Deterministic Normalization Notice')
  })
})

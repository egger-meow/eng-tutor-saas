import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'
import {
  CurriculumPackageSchema,
  CurriculumPackageV22Schema,
  CurriculumPackageV21Schema,
  CurriculumPackageV20Schema,
} from './curriculum-package-schema.js'

describe('Prompt 2.6.0 active invariant contract with frozen 2.4.0 and 2.5.0 inheritance', () => {
  it('enforces active Prompt 2.4.0 Wave 2 pedagogy invariants (Trigger-Pattern-Trap-Try, distractor reasoning, non-tautological explanations)', async () => {
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')
    const critic240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/03-critic.md'), 'utf8')

    // Operational mental model & mistake contrasting
    expect(author240).toContain('Trigger → Pattern → Trap → Try')
    expect(author240).toContain('Do NOT mechanically copy-paste or expose the literal labels')
    expect(author240).toContain('commonMistakes')

    // Diagnostic distractor design
    expect(author240).toContain('What flawed student reasoning would lead them to choose this?')
    expect(author240).toContain('partial evidence')
    expect(author240).toContain('reversed relationship')
    expect(critic240).toContain('Weak, Silly, or Unprincipled Distractors')

    // Non-tautological explanations
    expect(author240).toContain('Tautological explanations (e.g. 「答案 C，因為根據文章內容 C 正確」) are strictly forbidden.')
    expect(author240).toContain('likelyMisconceptionZh')
    expect(critic240).toContain('Circular or Tautological Explanations')
  })

  it('enforces active Prompt 2.4.0 Wave 3 low-model authoring scaffolds (micro few-shot, local Q&A protocol, deterministic normalization)', async () => {
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')

    // Micro contrastive few-shot
    expect(author240).toContain('Micro Contrastive Few-Shot (BAD ➔ GOOD)')
    expect(author240).toContain('Mina and Jay encounter a sensor failure')
    expect(author240).toContain('do / does 疑問句的動詞還原規則')

    // Local Q&A Authoring Protocol
    expect(author240).toContain('Local Question-Answer Authoring Protocol')
    expect(author240).toContain('author the question and its corresponding answer object')

    // Server-Side Deterministic Normalization Notice
    expect(author240).toContain('Server-Side Deterministic Normalization Notice')
  })

  it('enforces active Prompt 2.4.0 Wave 4 deep situational personalization and multi-genre blocks', async () => {
    const plan240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/01-plan.md'), 'utf8')
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')
    const critic240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/03-critic.md'), 'utf8')

    // Hierarchy & Matrix
    expect(plan240).toContain('The Golden Hierarchy: Target ➔ Genre ➔ Interest')
    expect(plan240).toContain('Genre Alignment Matrix')
    expect(plan240).toContain('Deep Situational Personalization (No Superficial Skinning)')
    expect(plan240).toContain('Pedagogy Over Novelty')

    // Multi-Genre Reading Blocks
    expect(author240).toContain('Schema 2.2.0 Multi-Genre Reading Blocks')
    expect(author240).toContain('schedule-row')
    expect(author240).toContain('Item-Type Rotation (Taiwan CAP Competency Distribution)')
    expect(critic240).toContain('Genre-Block Structural Consistency')
  })

  it('enforces active Prompt 2.4.0 Wave 4.1 CAP curriculum foundation & strict exposure invariants', async () => {
    const plan240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/01-plan.md'), 'utf8')
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')
    const critic240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/03-critic.md'), 'utf8')

    // Planning Priority & Capsule
    expect(plan240).toContain('The Strict Planning Priority Order')
    expect(plan240).toContain('CAP Coverage Capsule')

    // Exposure Invariant
    expect(author240).toContain('records **EXPOSURE ONLY**. Exposure is not evidence of mastery.')
    expect(author240).toContain('exposedGrammarTargetIds')
    expect(author240).toContain('exposedCommunicationFunctionIds')
    expect(critic240).toContain('Separation of Exposure vs Mastery')
  })

  it('enforces active Prompt 2.4.0 Wave 4.2 passage-first lexical contract & ceiling', async () => {
    const plan240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/01-plan.md'), 'utf8')
    const author240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/02-author.md'), 'utf8')
    const critic240 = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.4.0/03-critic.md'), 'utf8')

    expect(plan240).toContain('Passage-First Lexical Integration')
    expect(author240).toContain('Passage-First Lexical Contract & Ceiling')
    expect(author240).toContain('Vocabulary is Curriculum Anchor, Not Insertion Queue')
    expect(author240).toContain('Lexical Ceiling Invariant')
    expect(critic240).toContain('Passage-First Lexical Contract & Lexical Ceiling')
  })

  it('uses CurriculumPackageSchema 2.3.0 while preserving V22, V21, and V20 legacy schemas', async () => {
    const bundle = await readFile(resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md'), 'utf8')

    // Assert schema target domain enum still includes communication in 2.3.0.
    const targetDomainEnum = CurriculumPackageSchema.shape.learningPlan.shape.targets.element.shape.domain.options
    expect(targetDomainEnum).toEqual(['vocabulary', 'grammar', 'reading', 'writing', 'communication', 'review'])

    // Assert canonical schemaVersion is 2.3.0 and historical versions stay explicit.
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.3.0').success).toBe(true)
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(false)
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.1.0').success).toBe(false)

    expect(CurriculumPackageV22Schema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(true)
    expect(CurriculumPackageV22Schema.shape.metadata.shape.schemaVersion.safeParse('2.3.0').success).toBe(false)

    expect(CurriculumPackageV21Schema.shape.metadata.shape.schemaVersion.safeParse('2.1.0').success).toBe(true)
    expect(CurriculumPackageV21Schema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(false)

    expect(CurriculumPackageV20Schema.shape.metadata.shape.schemaVersion.safeParse('2.0.0').success).toBe(true)
    expect(CurriculumPackageV20Schema.shape.metadata.shape.schemaVersion.safeParse('2.2.0').success).toBe(false)

    // Bundle compiled with the grounded production versions and unchanged engine generation.
    expect(bundle).toContain('bundleVersion: "2.6.0-prod"')
    expect(bundle).toContain('schemaVersion: "2.3.0"')
    expect(bundle).toContain('engineVersion: "1.2.0"')

    // Assert adaptiveExtension is optional in Schema 2.2 studentLesson
    const studentLessonShape = CurriculumPackageSchema.shape.studentLesson.shape
    expect(studentLessonShape.adaptiveExtension).toBeDefined()
  })
})

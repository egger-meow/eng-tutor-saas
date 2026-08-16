import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'
import { CurriculumPackageSchema } from './curriculum-package-schema.js'

describe('Wave 2 Pedagogy & Contract Invariants', () => {
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

  it('preserves CurriculumPackageSchema 2.0.0 without field mutations or target-type enums', () => {
    // Assert schema target domain enum remains strictly the 5 standard domains
    const targetDomainEnum = CurriculumPackageSchema.shape.learningPlan.shape.targets.element.shape.domain.options
    expect(targetDomainEnum).toEqual(['vocabulary', 'grammar', 'reading', 'writing', 'review'])

    // Assert metadata schemaVersion literal remains 2.0.0
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.0.0').success).toBe(true)
    expect(CurriculumPackageSchema.shape.metadata.shape.schemaVersion.safeParse('2.1.0').success).toBe(false)
  })

  it('contains zero Wave 4 concept leaks in active prompts and bundle', async () => {
    const bundle = await readFile(resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md'), 'utf8')
    
    // Wave 4 non-goals: no dialogue/infographic/schedule genre systems, no visual box CSS, no finisher auto-heal
    expect(bundle).not.toContain('infographic-genre')
    expect(bundle).not.toContain('schedule-genre')
    expect(bundle).not.toContain('finisherAutoHeal')
    expect(bundle).not.toContain('guided-box-css')
  })
})

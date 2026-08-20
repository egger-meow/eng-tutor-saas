import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(new URL('../.github/workflows/finish-curriculum-submissions.yml', import.meta.url), 'utf8')

describe('Finisher workflow production secret scope', () => {
  it('never defines Supabase production secrets at job scope', () => {
    expect(workflow).not.toMatch(/^    env:\s*\n(?:      .+\n)*?      SUPABASE_/m)
  })

  it('exposes production secrets only to validation and Finisher execution steps', () => {
    const lines = workflow.split(/\r?\n/u)
    const secretLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes('secrets.SUPABASE_'))

    expect(secretLines).toHaveLength(4)
    for (const { index } of secretLines) {
      const precedingStep = lines.slice(0, index + 1).reverse().find((line) => /^      - name:/u.test(line))
      expect(precedingStep).toMatch(/Validate required worker secrets|Audit, render, upload, and complete submitted packages/u)
    }
  })
})

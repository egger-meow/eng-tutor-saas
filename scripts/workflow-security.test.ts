import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(new URL('../.github/workflows/finish-curriculum-submissions.yml', import.meta.url), 'utf8')
const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy-cloudflare-pages.yml', import.meta.url), 'utf8')

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

describe('Cloudflare Pages deployment boundaries', () => {
  it('deploys the root-based web build to the production Pages project', () => {
    expect(deployWorkflow).toContain('url: https://paperbond.jjmowlab.com')
    expect(deployWorkflow).toContain('pages deploy apps/web/dist --project-name=paperbond --branch=main')
    expect(deployWorkflow).not.toContain('VITE_BASE_PATH')
    expect(deployWorkflow).not.toContain('404.html')
  })

  it('does not expose worker or Paddle server secrets to the browser build', () => {
    expect(deployWorkflow).not.toMatch(/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/u)
    expect(deployWorkflow).not.toMatch(/PADDLE_(?:API_KEY|WEBHOOK_SECRET)/u)
    expect(deployWorkflow).toContain('secrets.CLOUDFLARE_API_TOKEN')
    expect(deployWorkflow).toContain('secrets.CLOUDFLARE_ACCOUNT_ID')
  })
})

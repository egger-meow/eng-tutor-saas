import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(new URL('../.github/workflows/finish-curriculum-submissions.yml', import.meta.url), 'utf8')
const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy-cloudflare-workers.yml', import.meta.url), 'utf8')
const wranglerConfig = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')) as {
  assets: { directory: string, not_found_handling: string }
  routes: Array<{ pattern: string, custom_domain: boolean }>
  workers_dev: boolean
}

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

describe('Cloudflare Workers Static Assets deployment boundaries', () => {
  it('deploys the root-based web build with SPA routing on the production domain', () => {
    expect(deployWorkflow).toContain('url: https://paperbond.jjmowlab.com')
    expect(deployWorkflow).toContain('command: deploy --config wrangler.jsonc')
    expect(deployWorkflow).not.toContain('VITE_BASE_PATH')
    expect(deployWorkflow).not.toContain('404.html')
    expect(wranglerConfig.assets).toEqual({
      directory: 'apps/web/dist',
      not_found_handling: 'single-page-application',
    })
    expect(wranglerConfig.routes).toContainEqual({
      pattern: 'paperbond.jjmowlab.com',
      custom_domain: true,
    })
    expect(wranglerConfig.workers_dev).toBe(false)
  })

  it('does not expose worker or Paddle server secrets to the browser build', () => {
    expect(deployWorkflow).not.toMatch(/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/u)
    expect(deployWorkflow).not.toMatch(/PADDLE_(?:API_KEY|WEBHOOK_SECRET)/u)
    expect(deployWorkflow).toContain('secrets.CLOUDFLARE_API_TOKEN')
    expect(deployWorkflow).toContain('secrets.CLOUDFLARE_ACCOUNT_ID')
  })
})

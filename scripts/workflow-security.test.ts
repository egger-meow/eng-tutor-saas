import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(new URL('../.github/workflows/finish-curriculum-submissions.yml', import.meta.url), 'utf8')
const materialEmailWorkflow = readFileSync(new URL('../.github/workflows/dispatch-material-emails.yml', import.meta.url), 'utf8')
const productionWorkflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const devDeployWorkflow = readFileSync(new URL('../.github/workflows/deploy-cloudflare-workers.yml', import.meta.url), 'utf8')
const wranglerConfig = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')) as {
  assets: { directory: string, not_found_handling: string }
  routes: Array<{ pattern: string, custom_domain: boolean }>
  workers_dev: boolean
  env: {
    dev: {
      workers_dev: boolean
      routes: Array<{ pattern: string, custom_domain: boolean }>
    }
  }
}

describe('Finisher workflow production secret scope', () => {
  it('never defines Supabase production secrets at job scope', () => {
    expect(workflow).not.toMatch(/^    env:\s*\n(?:      .+\n)*?      SUPABASE_/m)
  })

  it('exposes production secrets only to validation and Finisher steps', () => {
    const lines = workflow.split(/\r?\n/u)
    const secretLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes('secrets.SUPABASE_'))

    expect(secretLines).toHaveLength(4)
    for (const { index } of secretLines) {
      const precedingStep = lines.slice(0, index + 1).reverse().find((line) => /^      - name:/u.test(line))
      expect(precedingStep).toMatch(/Validate required worker secrets|Audit, render, upload, and complete submitted packages/u)
    }
    expect(workflow).not.toContain('Dispatch released material notifications')
  })

  it('runs a lightweight Gmail SMTP dispatcher every ten minutes without PDF tooling', () => {
    expect(materialEmailWorkflow).toContain("cron: '*/10 * * * *'")
    expect(materialEmailWorkflow).toContain('SMTP_USER: ${{ secrets.SMTP_USER }}')
    expect(materialEmailWorkflow).toContain('SMTP_PASS: ${{ secrets.SMTP_PASS }}')
    expect(materialEmailWorkflow).toContain('MATERIAL_LINK_SECRET: ${{ secrets.MATERIAL_LINK_SECRET }}')
    expect(materialEmailWorkflow).toContain('dispatch-material-emails')
    expect(materialEmailWorkflow).not.toMatch(/RESEND|Playwright|Chromium|pdf:install/u)
  })
})

describe('Cloudflare Workers Static Assets deployment boundaries', () => {
  it('gates production deployment on main CI verification', () => {
    expect(productionWorkflow).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'")
    expect(productionWorkflow).toContain('needs: verify')
    expect(productionWorkflow).toContain('url: https://paperbond.jjmowlab.com')
    expect(productionWorkflow).toContain('VITE_BASE_PATH: /')
    expect(productionWorkflow).toContain('wrangler deploy --config wrangler.jsonc')
    expect(productionWorkflow).not.toContain('wrangler deploy --config wrangler.jsonc --env dev')
    expect(productionWorkflow).not.toContain('404.html')
  })

  it('deploys dev directly to its isolated Cloudflare environment', () => {
    expect(devDeployWorkflow).toContain('branches: [dev]')
    expect(devDeployWorkflow).toContain('url: https://dev.paperbond.jjmowlab.com')
    expect(devDeployWorkflow).toContain('VITE_BASE_PATH: /')
    expect(devDeployWorkflow).toContain('wrangler deploy --config wrangler.jsonc --env dev')
    expect(devDeployWorkflow).not.toContain('404.html')
  })

  it('maps repository browser variables into both deployment jobs', () => {
    for (const deployWorkflow of [productionWorkflow, devDeployWorkflow]) {
      expect(deployWorkflow).toContain('VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}')
      expect(deployWorkflow).toContain('VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}')
      expect(deployWorkflow).toContain('VITE_PADDLE_CLIENT_TOKEN: ${{ vars.VITE_PADDLE_CLIENT_TOKEN }}')
      expect(deployWorkflow).toContain('test -n "$VITE_SUPABASE_URL"')
      expect(deployWorkflow).toContain('test -n "$VITE_SUPABASE_PUBLISHABLE_KEY"')
      expect(deployWorkflow).toContain('test -n "$VITE_PADDLE_CLIENT_TOKEN"')
    }
  })

  it('builds the production payment page against Paddle production', () => {
    expect(productionWorkflow).toContain('VITE_PADDLE_ENV: production')
    expect(devDeployWorkflow).toContain('VITE_PADDLE_ENV: sandbox')
  })

  it('keeps root-based SPA routing isolated across production and dev domains', () => {
    expect(wranglerConfig.assets).toEqual({
      directory: 'apps/web/dist',
      not_found_handling: 'single-page-application',
    })
    expect(wranglerConfig.routes).toContainEqual({
      pattern: 'paperbond.jjmowlab.com',
      custom_domain: true,
    })
    expect(wranglerConfig.env.dev.routes).toContainEqual({
      pattern: 'dev.paperbond.jjmowlab.com',
      custom_domain: true,
    })
    expect(wranglerConfig.workers_dev).toBe(false)
    expect(wranglerConfig.env.dev.workers_dev).toBe(false)
  })

  it('does not expose worker or Paddle server secrets to either browser build', () => {
    for (const deployWorkflow of [productionWorkflow, devDeployWorkflow]) {
      expect(deployWorkflow).not.toMatch(/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/u)
      expect(deployWorkflow).not.toMatch(/PADDLE_(?:API_KEY|WEBHOOK_SECRET)/u)
      expect(deployWorkflow).toContain('secrets.CLOUDFLARE_API_TOKEN')
      expect(deployWorkflow).toContain('secrets.CLOUDFLARE_ACCOUNT_ID')
    }
  })
})

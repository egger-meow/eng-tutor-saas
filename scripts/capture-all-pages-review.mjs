import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-visual-review-fixture'

const outputDir = resolve('.runtime/visual-review')
await mkdir(outputDir, { recursive: true })

const server = await createServer({
  root: resolve('apps/web'),
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
})
await server.listen()

const browser = await chromium.launch({ headless: true })

try {
  // 1. Desktop Review (1440x900)
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2, // Retina crispness
      reducedMotion: 'reduce',
    })

    // Mock API responses for clean visual render
    await context.route('http://127.0.0.1:54321/**', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      let body = null
      if (name === 'get_enrollment_state') {
        body = [{ status: 'open', capacity: 100, active_count: 1, remaining: 99, founding_limit: 30, founding_count: 0, free_pilot_active: true }]
      } else if (name === 'children') {
        body = [] // Orphan scenario for dashboard check
      } else if (name === 'subscriptions') {
        body = []
      } else if (name === 'profiles') {
        body = { terms_version: '2026-08' }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    const page = await context.newPage()

    // (A) Landing Page Hero
    console.log('Capturing Desktop Landing Hero...')
    await page.goto('http://127.0.0.1:5188/')
    await page.locator('h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outputDir}/desktop-01-landing-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 920 } })

    // (B) Landing Page Samples (#samples)
    console.log('Capturing Desktop Inline Sample Challenge...')
    await page.locator('#samples').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outputDir}/desktop-02-inline-samples.png` })

    // (C) Landing Page Onboarding (#onboarding)
    console.log('Capturing Desktop Express Onboarding Card...')
    await page.locator('#onboarding').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outputDir}/desktop-03-onboarding-card.png` })

    // (D) Landing Page Pricing (#pricing)
    console.log('Capturing Desktop Pricing...')
    await page.locator('#pricing').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outputDir}/desktop-04-pricing.png` })

    // (E) Sample Reader Page (/sample)
    console.log('Capturing Sample Reader Page...')
    await page.goto('http://127.0.0.1:5188/sample')
    await page.getByRole('heading', { name: '讀一篇、試著答，再看結果。' }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outputDir}/desktop-05-sample-reader-top.png` })

    // (F) Paper Fast-Track Component
    console.log('Capturing Paper Fast-Track Box...')
    await page.goto('http://127.0.0.1:5188/.runtime/fixture.html?view=paper-fast-track')
    await page.locator('.paper-fast-track-box').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outputDir}/desktop-06-paper-fast-track.png` })

    // (G) Next Week Learning Hook Component
    console.log('Capturing Next Week Learning Direction Hook...')
    await page.goto('http://127.0.0.1:5188/.runtime/fixture.html?view=next-step-hook')
    await page.locator('.next-week-preview-card').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outputDir}/desktop-07-next-week-hook.png` })

    // (H) Dashboard Orphan Recovery Card
    console.log('Capturing Dashboard Orphan Recovery Card...')
    await page.goto('http://127.0.0.1:5188/.runtime/fixture.html?view=dashboard-orphan')
    await page.locator('.orphan-recovery-highlights').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outputDir}/desktop-08-dashboard-orphan.png` })

    // (I) Guide Page (/guide)
    console.log('Capturing Guide Page...')
    await page.goto('http://127.0.0.1:5188/guide')
    await page.locator('h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outputDir}/desktop-09-guide-page.png` })

    await page.close()
    await context.close()
  }

  // 2. Mobile Review (iPhone 14 / 390x844)
  {
    console.log('Capturing Mobile Views...')
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    })

    await context.route('http://127.0.0.1:54321/**', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      let body = null
      if (name === 'get_enrollment_state') {
        body = [{ status: 'open', capacity: 100, active_count: 1, remaining: 99, founding_limit: 30, founding_count: 0, free_pilot_active: true }]
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    const page = await context.newPage()

    // Mobile Hero
    await page.goto('http://127.0.0.1:5188/')
    await page.locator('h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outputDir}/mobile-01-landing-hero.png` })

    // Mobile Live Preview Card in Hero
    const livePreview = page.locator('.hero-live-preview-card')
    if (await livePreview.count() > 0) {
      await livePreview.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${outputDir}/mobile-02-live-preview-card.png` })
    }

    // Mobile Samples
    await page.locator('#samples').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outputDir}/mobile-03-samples.png` })

    // Mobile Onboarding
    await page.locator('#onboarding').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outputDir}/mobile-04-onboarding.png` })

    await page.close()
    await context.close()
  }

  console.log(`All visual review screenshots captured successfully in ${outputDir}!`)
} finally {
  await browser.close()
  await server.close()
}

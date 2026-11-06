import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-founder-preview'
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5183, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true })
await mkdir('.runtime/founder', { recursive: true })
try {
  for (const width of [320, 390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
    await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('http://127.0.0.1:5183/about')
    await page.getByRole('heading', { name: '你好，我是 JJmow 老師。' }).waitFor()
    assert.equal(await page.getByRole('main').count(), 1)
    const portrait = page.locator('.founder-brand-art')
    await portrait.evaluate(img => img.decode())
    assert.ok(await portrait.evaluate(img => img.naturalWidth > 0))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `.runtime/founder/about-${width}.png`, fullPage: true })
    await page.getByRole('link', { name: '看看紙屬英文的教材' }).click()
    await page.locator('.founder-signature').waitFor()
    await page.locator('.founder-signature').click()
    await page.locator('#founder').scrollIntoViewIfNeeded()
    await page.locator('#founder').screenshot({ path: `.runtime/founder/section-${width}.png` })
    await page.screenshot({ path: `.runtime/founder/home-${width}.png`, fullPage: true })
    await page.getByRole('link', { name: '認識 JJmow 老師與紙屬英文 →' }).click()
    await page.getByRole('heading', { name: '你好，我是 JJmow 老師。' }).waitFor()
    console.log(`PASS ${width}px: portrait, overflow, founder anchor and about navigation`)
    await page.close()
  }
} finally { await browser.close(); await server.close() }

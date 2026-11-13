// Synthetic public-only regression: never sends login email or creates a child.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-landing-auth-regression'
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5186, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
const output = resolve('output/landing-auth-regression')
await mkdir(output, { recursive: true })
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } })
    await page.route('**/rest/v1/rpc/record_funnel_event', route => route.fulfill({contentType:'application/json',body:'null'}))
    await page.route('**/rest/v1/rpc/get_enrollment_state', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{status:'open',capacity:100,active_count:1,remaining:99,founding_limit:30,founding_count:0,free_pilot_active:true}]) }))
    await page.goto('http://127.0.0.1:5186/')
    const headerLogin = async () => {
      const menu = page.getByRole('button', { name: '開啟導覽選單', exact: true })
      if (await menu.isVisible()) await menu.click()
      await page.getByRole('link', { name: '已有帳號？登入', exact: true }).click()
      await page.locator('#login-email').waitFor({ state: 'visible' })
      await page.waitForFunction(() => { const y = document.getElementById('login')?.getBoundingClientRect().top; return y >= 0 && y < innerHeight * 0.35 && document.activeElement?.id === 'login-email' }).catch(async error => { console.log(await page.evaluate(() => ({ url: location.href, y: document.getElementById('login')?.getBoundingClientRect().top, focus: document.activeElement?.outerHTML.slice(0,180) }))); await page.screenshot({path: `${output}/${width}-failure.png`}); throw error })
    }
    await headerLogin() // Fresh onboarding state, login card does not exist yet.
    for (let repeat = 0; repeat < 2; repeat++) {
      await page.getByRole('button', { name: /首次使用？點此返回/ }).click()
      await page.locator('#onboarding').waitFor({ state: 'visible' })
      assert.equal(new URL(page.url()).hash, '#login') // The formerly broken same-hash path.
      await headerLogin()
    }
    await page.reload()
    await page.locator('#login-email').waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /首次使用？點此返回/ }).click()
    await page.getByRole('button', { name: '點此登入查看教材 →', exact: true }).click()
    await page.waitForFunction(() => document.activeElement?.id === 'login-email')
    await page.screenshot({ path: `${output}/${width}-login.png` })
    await page.evaluate(() => { dispatchEvent(new WheelEvent('wheel')); scrollBy({top:200,behavior:'instant'}) })
    const userScroll = await page.evaluate(() => scrollY)
    await page.evaluate(() => { document.querySelector('main').style.paddingBottom = '100px' })
    await page.waitForTimeout(100)
    assert.equal(await page.evaluate(() => scrollY), userScroll, 'layout alignment stops after user scroll')
    await page.goto('http://127.0.0.1:5186/sample')
    await headerLogin() // Cross-route entry must also mount login mode.
    await page.goBack()
    await page.waitForURL('**/sample')
    await page.goForward()
    await page.locator('#login-email').waitFor({ state: 'visible' })
    await page.goto('http://127.0.0.1:5186/material')
    await page.getByRole('button', {name:'登入紙屬英文',exact:true}).click()
    await page.locator('#login-email').waitFor({state:'visible'})
    assert.equal(new URL(page.url()).hash, '#login')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    console.log(`${width}px: fresh header, same-hash repeats, reload, inline, cross-route and history passed`)
    await page.close()
  }
} finally { await browser.close(); await server.close() }

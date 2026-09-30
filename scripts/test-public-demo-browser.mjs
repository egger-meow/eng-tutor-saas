// Synthetic public sample acceptance; no real account, learner data, or service writes.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-demo-fixture'
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5179, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true })
await mkdir('.runtime/s6', { recursive: true })
const evidence = []
try {
  for (const [device, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 1000 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    await context.addInitScript(() => {
      class Utterance { constructor(text) { this.text = text } }
      window.SpeechSynthesisUtterance = Utterance
      const events = new EventTarget()
      window.__spoken = []
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [{ voiceURI: 'synthetic-english', name: 'Synthetic English', lang: 'en-US' }],
        addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args),
        cancel: () => {}, speak: (utterance) => { window.__spoken.push(utterance.text); utterance.onstart?.() },
      }, configurable: true })
    })
    const serviceRequests = []
    await context.route('http://127.0.0.1:54321/**', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      serviceRequests.push({ name, body: route.request().postData() })
      const body = name === 'get_enrollment_state' ? [{ status: 'open', capacity: 100, active_count: 1, remaining: 99, founding_limit: 30, founding_count: 0, free_pilot_active: true }] : null
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('http://127.0.0.1:5179/sample')
    await page.getByRole('heading', { name: '讀一篇、試著答，再看結果。' }).waitFor()
    assert.equal(await page.getByText('參考答案：', { exact: false }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    await page.locator('#q-card-R1 [role="button"]').nth(1).click()
    await page.locator('#q-card-R4 [role="button"]').nth(2).press('Enter')
    await page.locator('#q-card-R2 textarea').fill('Every plant gets the same water.')
    await page.reload()
    await page.locator('#q-card-R2 textarea').waitFor()
    assert.equal(await page.locator('#q-card-R2 textarea').inputValue(), 'Every plant gets the same water.')
    assert.equal(await page.locator('#q-card-R1 [aria-pressed="true"]').count(), 1)
    await page.getByRole('button', { name: '朗讀整篇文章', exact: true }).click()
    assert.ok((await page.evaluate(() => window.__spoken)).length > 0)
    await page.getByRole('button', { name: '停止朗讀整篇文章', exact: true }).click()
    await page.getByRole('button', { name: '提交整份範例', exact: true }).click()
    await page.getByRole('button', { name: '繼續作答', exact: true }).click()
    assert.equal(await page.locator('.demo-results').count(), 0)
    await page.getByRole('button', { name: '提交整份範例', exact: true }).click()
    await page.getByRole('button', { name: '確認提交範例', exact: true }).click()
    await page.getByRole('heading', { name: '範例提交結果' }).waitFor()
    assert.equal(await page.locator('.demo-results li').count(), 11)
    for (const status of ['答對', '答錯', '未作答', '開放題尚未評分']) assert.ok((await page.locator('.demo-results').textContent()).includes(status))
    assert.equal(await page.locator('#q-card-R2 textarea').getAttribute('readonly'), '')
    await page.locator('#q-card-R1 [role="button"]').first().dispatchEvent('click')
    assert.equal(await page.locator('#q-card-R1 [role="button"]').nth(1).getAttribute('aria-pressed'), 'true')
    await page.reload()
    await page.getByRole('heading', { name: '範例提交結果' }).waitFor()
    await page.screenshot({ path: `.runtime/s6/${device}-results.png`, fullPage: true })
    const pdf = await page.request.get('http://127.0.0.1:5179/samples/demo-student.pdf')
    assert.equal(pdf.status(), 200)
    assert.equal((await pdf.body()).subarray(0, 4).toString(), '%PDF')
    assert.equal(await page.getByRole('link', { name: '空白列印版 PDF', exact: true }).getAttribute('href'), '/samples/demo-student.pdf')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '清除並重新體驗', exact: true }).click()
    assert.equal(await page.locator('#q-card-R2 textarea').inputValue(), '')
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('synthetic storage unavailable') } })
    await page.locator('#q-card-R2 textarea').fill('Local-only failure probe')
    await page.getByText('瀏覽器無法保存', { exact: false }).waitFor()
    await page.getByRole('link', { name: '已有帳號，登入看教材', exact: true }).click()
    await page.waitForURL('**/#login')
    await page.locator('#login input').waitFor()
    assert.ok(serviceRequests.every((request) => ['get_enrollment_state', 'record_funnel_event'].includes(request.name)), JSON.stringify(serviceRequests.map((request) => request.name)))
    assert.ok(!serviceRequests.some((request) => request.body?.includes('Every plant gets the same water') || request.body?.includes('Local-only failure probe')))
    assert.deepEqual(errors, [])
    evidence.push({ device, viewport, result: 'PASS', actualDevice: false, serviceRequests: serviceRequests.map((item) => item.name) })
    await context.close()
  }
  console.log(JSON.stringify({ fixture: 'synthetic anonymous public sample; simulated device speech', evidence }, null, 2))
} finally { await browser.close(); await server.close() }

// Synthetic UI acceptance fixture. RPC behavior is mocked here; authorization,
// grading and transactional invariants are verified by test:db separately.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-browser-fixture'
const fixtureDir = resolve('apps/web/.runtime')
await mkdir(fixtureDir, { recursive: true })
await writeFile(resolve(fixtureDir, 'online-reader.html'), '<div id="root"></div><script type="module" src="/\.runtime/online-reader.tsx"></script>')
await writeFile(resolve(fixtureDir, 'online-reader.tsx'), `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PaperReader} from '../src/components/materials/renderer/PaperReader';
import {MaterialActions} from '../src/components/materials/MaterialActions';
import '../src/index.css'; import '../src/App.css';
createRoot(document.getElementById('root')).render(<><MaterialActions childName="合成驗收教材" showPreviewLink material={{id:'synthetic-material',child_id:'synthetic-child',material_week:'2026-09-30',revision:1,student_pdf_path:'',parent_answer_pdf_path:'',generation_summary:{},created_at:'2026-09-30',release_at:'2026-09-30',feedback:null}}/><PaperReader projection={{
 material_id:'synthetic-material',child_id:'synthetic-child',child_name:'合成驗收教材',
 material_week:'2026-09-30',week_number:1,revision:1,title:'Synthetic UI fixture',
 student_pdf_path:'',release_at:'2026-09-30',student_lesson:{
 vocabulary:[{id:'v1',word:'sound',meaningZh:'聲音'}],
 reading:{title:'Read and listen',blocks:[{type:'paragraph',text:'We hear a sound.'}]},
 practice:[{id:'stage',titleZh:'練習',questions:[
 {id:'q1',prompt:'Choose a sound.',options:['Music','Silence']},
 {id:'q2',prompt:'Write a sentence.'},
 {id:'q3',prompt:'Complete a table.',responseLayout:{type:'table',headers:['Clue','Response'],rows:[{label:'Sound',cells:[{responseUnitId:'q3-cell',placeholder:'Your observation'}]}]}},
 {id:'q4',prompt:'Explain a new format.',responseLayout:{type:'custom',title:'Compare these observations',items:['A long unfamiliar lesson description']}}]}],selfCheckZh:['已閱讀']
 }}}/></>);
`)
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5178, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true })
const evidence = []
try {
  for (const [device, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 1000 }]]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(() => {
      class Utterance { constructor(text) { this.text = text } }
      window.SpeechSynthesisUtterance = Utterance
      let current = null
      const events = new EventTarget()
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [{ voiceURI: 'synthetic-english', name: 'Synthetic English', lang: 'en-US' }],
        addEventListener: (...args) => events.addEventListener(...args),
        removeEventListener: (...args) => events.removeEventListener(...args),
        cancel: () => { const prior = current; current = null; prior?.onerror?.({ error: 'canceled' }) },
        speak: (utterance) => { current = utterance; utterance.onstart?.() },
      }, configurable: true })
    })
    let draft = { answers: {}, self_check: [], version: 0, updated_at: null }
    let submission = null
    let requests = 0
    let feedback = 0
    let delaySave = false
    let quota = false
    let failSubmissionRead = true
    let savedFeedback = null
    let pdfRequests = 0
    const learningEvents = []
    await context.route('http://127.0.0.1:54321/**', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null
      let response
      if (name === 'material-pdf') {
        assert.equal(body.materialId, 'synthetic-material')
        assert.equal(body.kind, 'student')
        assert.equal(body.path, undefined, 'browser cannot select a storage object')
        pdfRequests++
        await new Promise((done) => setTimeout(done, 400))
        response = pdfRequests === 1 ? { state: 'queued' } : { state: 'ready', url: 'http://127.0.0.1:54321/synthetic.pdf' }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
        return
      }
      if (name === 'synthetic.pdf') {
        await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-synthetic-download-fixture' })
        return
      }
      if (name === 'feedback') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ difficulty: 3, weak_area: 'reading', parent_comments: 'Existing observation', mistakes_text: 'Preserved mistakes', child_comments: 'Preserved child voice' }) })
        return
      }
      if (name === 'get_student_material_submission' && failSubmissionRead) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'synthetic read failure' }) })
        return
      }
      if (name === 'get_material_draft') response = [draft]
      else if (name === 'can_open_parent_answer') response = false
      else if (name === 'get_student_material_submission') response = submission
      else if (name === 'save_material_draft') {
        if (delaySave) await new Promise((done) => setTimeout(done, 1200))
        if (body.p_client_version !== draft.version) response = { conflict: true, ...draft }
        else {
          draft = { answers: body.p_answers, self_check: body.p_self_check, version: draft.version + 1, updated_at: new Date().toISOString() }
          response = { success: true, ...draft }
        }
      } else if (name === 'submit_student_material') {
        submission ??= { ...draft, submitted_at: new Date().toISOString(), results: [
          { question_id: 'q1', status: 'correct', correct_answer: 'Music' },
          { question_id: 'q2', status: 'open_review', correct_answer: 'Sample sentence.' },
        ], next_requested: false }
        response = submission
      } else if (name === 'save_student_parent_feedback') { feedback++; savedFeedback = body; response = true }
      else if (name === 'request_next_after_student_submission') {
        if (quota) response = { requested: false, reason: 'MONTHLY_LIMIT', used: 4, limit: 4 }
        else { requests++; submission.next_requested = true; response = { requested: true } }
      } else if (name === 'record_material_learning_event') {
        assert.deepEqual(Object.keys(body).sort(), ['p_event_name', 'p_material_id'])
        assert.equal(body.p_material_id, 'synthetic-material')
        learningEvents.push(body.p_event_name)
        response = null
      } else throw new Error(`Unexpected fixture RPC: ${name}`)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response), headers: { 'access-control-allow-origin': '*' } })
    })
    const page = await context.newPage()
    const url = 'http://127.0.0.1:5178/.runtime/online-reader.html'
    await page.goto(url)
    const submit = page.getByRole('button', { name: '提交整份教材', exact: true })
    await submit.waitFor()
    await page.getByRole('button', { name: '下載學生教材', exact: true }).click()
    await page.getByRole('button', { name: '準備中…', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '準備中…', exact: true }).isDisabled(), true)
    await page.getByText('PDF 正在準備', { exact: false }).waitFor()
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '下載學生教材', exact: true }).click()
    const downloaded = await downloadEvent
    assert.match(downloaded.suggestedFilename(), /學生教材\.pdf$/)
    assert.equal(pdfRequests, 2)
    await page.waitForFunction(() => !document.querySelector('.paper-reader-container')?.inert)
    await page.getByRole('button', { name: '重試提交狀態', exact: true }).waitFor()
    assert.equal(await submit.isDisabled(), true)
    assert.equal(await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).getAttribute('readonly'), '')
    failSubmissionRead = false
    await page.getByRole('button', { name: '重試提交狀態', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('.paper-reader-container')?.inert)
    await page.getByRole('button', { name: '重試進度', exact: true }).click()
    await page.getByText('可開始閱讀與作答', { exact: false }).waitFor()
    await page.getByRole('button', { name: '朗讀整篇文章', exact: true }).click()
    await page.getByRole('button', { name: '停止朗讀整篇文章', exact: true }).waitFor()
    await page.getByRole('button', { name: '聆聽 sound 發音', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '朗讀整篇文章', exact: true }).count(), 1, 'switching sections resets prior speaking state')
    await page.getByRole('button', { name: '停止 sound 發音', exact: true }).click()
    await page.getByRole('textbox', { name: 'Complete a table.', exact: false }).fill('Structured observation')
    await page.getByRole('textbox', { name: 'Explain a new format.', exact: true }).fill('Fallback observation')
    await page.getByText('Compare these observations', { exact: true }).waitFor()
    if (device === 'phone') assert.equal(await page.locator('.paper-reader-toolbar').evaluate((element) => getComputedStyle(element).position), 'static')
    assert.equal(await page.getByText('正解：').count(), 0)
    delaySave = true
    await page.getByRole('button', { name: 'A Music' }).click()
    await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).fill('My saved sentence.')
    assert.equal(await submit.isDisabled(), true, 'cannot submit while saving')
    assert.equal(await page.evaluate(() => window.dispatchEvent(new Event('paper-english:before-navigate', { cancelable: true }))), false, 'pending saves block internal navigation')
    await page.waitForFunction(() => document.querySelector('.paper-save-status')?.classList.contains('status-saved'))
    delaySave = false
    assert.equal(draft.answers.q2, 'My saved sentence.', 'in-flight edits persist')
    // A second tab writes the same server draft; the first must resolve conflict.
    const tab = await context.newPage(); await tab.goto(url)
    await tab.waitForFunction(() => !document.querySelector('.paper-reader-container')?.inert)
    await tab.getByRole('textbox', { name: 'Write a sentence.', exact: true }).fill('Other tab sentence.')
    await tab.waitForFunction(() => document.querySelector('.paper-save-status')?.classList.contains('status-saved'))
    await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).fill('Local conflicting sentence.')
    await page.getByRole('button', { name: '載入最新伺服器版本' }).click()
    assert.equal(await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).inputValue(), 'Other tab sentence.')
    await context.setOffline(true)
    await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).fill('Offline pending sentence.')
    await page.getByText('儲存失敗', { exact: false }).waitFor()
    await context.setOffline(false)
    await page.waitForFunction(() => document.querySelector('.paper-save-status')?.classList.contains('status-saved'))
    page.on('dialog', (dialog) => dialog.accept())
    await submit.click()
    await page.getByText('正解：Music', { exact: false }).waitFor()
    assert.equal(await page.getByRole('textbox', { name: 'Write a sentence.', exact: true }).getAttribute('readonly'), '')
    assert.equal(submission.answers['q3-cell'], 'Structured observation')
    assert.equal(submission.answers.q4, 'Fallback observation')
    assert.equal(await page.locator('.tts-button').first().isEnabled(), true)
    await page.getByRole('button', { name: '略過回饋', exact: true }).click()
    quota = true
    await page.getByRole('button', { name: '申請下一份教材', exact: true }).click()
    await page.getByText('本服務月已使用', { exact: false }).waitFor()
    quota = false
    await page.reload()
    await page.getByRole('button', { name: '略過回饋', exact: true }).click()
    await page.getByRole('button', { name: '申請下一份教材', exact: true }).click()
    await page.getByText('已收到下一份申請。', { exact: true }).waitFor()
    await page.reload()
    await page.getByText('已收到下一份申請。', { exact: true }).waitFor()
    await page.getByText('已提交 · 已申請下一份', { exact: true }).waitFor()
    assert.equal(requests, 1)
    assert.equal(feedback, 0, 'skip does not fabricate feedback')
    assert.equal(await page.evaluate(() => window.dispatchEvent(new Event('paper-english:before-navigate', { cancelable: true }))), true, 'saved submission permits navigation')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow')
    await mkdir(resolve('.runtime/online-materials'), { recursive: true })
    await page.screenshot({ path: resolve(`.runtime/online-materials/${device}.png`), fullPage: true })
    submission.next_requested = false
    await page.reload()
    await page.getByRole('button', { name: '填寫回饋', exact: true }).click()
    await page.getByRole('button', { name: '儲存回饋', exact: true }).waitFor()
    await page.getByRole('textbox', { name: '其他觀察（選填）', exact: true }).fill('Updated observation')
    await page.getByRole('button', { name: '儲存回饋', exact: true }).click()
    await page.getByRole('button', { name: '申請下一份教材', exact: true }).waitFor()
    assert.equal(requests, 1, 'saving optional feedback never requests next')
    assert.ok(learningEvents.includes('material_opened'))
    assert.ok(learningEvents.includes('answer_started'))
    assert.ok(learningEvents.includes('student_downloaded'))
    assert.ok(!learningEvents.includes('material_submitted'), 'authoritative events are not sent by browser')
    assert.equal(feedback, 1)
    assert.equal(savedFeedback.p_mistakes_text, 'Preserved mistakes')
    assert.equal(savedFeedback.p_child_comments, 'Preserved child voice')
    assert.equal(savedFeedback.p_parent_comments, 'Updated observation')
    evidence.push({ device, viewport, result: 'PASS', actualDevice: false })
    await context.close()
  }
  console.log(JSON.stringify({ fixture: 'synthetic mocked RPC UI; SQL verified separately', evidence }, null, 2))
} finally { await browser.close(); await server.close() }

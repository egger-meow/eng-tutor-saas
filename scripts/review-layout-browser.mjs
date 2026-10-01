// Public layout inspection only. All service responses are synthetic.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-layout-fixture'
const phase = process.argv[2] ?? 'before'
const output = resolve(`.runtime/layout-review/${phase}`)
await mkdir(output, { recursive: true })
await mkdir('apps/web/.runtime', { recursive: true })
await writeFile('apps/web/.runtime/layout-review.html', '<div id="root"></div><script type="module" src="/.runtime/layout-review.tsx"></script>')
await writeFile('apps/web/.runtime/layout-review.tsx', `
import React from 'react';import {createRoot} from 'react-dom/client';
import {AppShell} from '../src/components/layout/AppShell';import {ParentNavigation} from '../src/components/layout/ParentNavigation';
import {ChildCard} from '../src/components/dashboard/ChildCard';import {ChildOnboardingPage} from '../src/routes/ChildOnboardingPage';
import {BillingPage} from '../src/routes/BillingPage';
import {emptyProfileDraft} from '../src/lib/profile-form';import '../src/index.css';import '../src/App.css';
const child={id:'synthetic-child',display_name:'合成版面驗收',grade:7,grade_stage:'grade_7',textbook_version:'翰林',profile:null,subscription:{status:'trialing'}};
const material={id:'synthetic-material',child_id:child.id,material_week:'2026-09-30',week_number:1,revision:1,student_pdf_path:'',parent_answer_pdf_path:'',release_at:'2026-09-30',created_at:'2026-09-30',generation_summary:{title:'合成範例：本週閱讀與作答'},feedback:null};
const session={user:{id:'synthetic-parent',email:'synthetic@example.invalid'}};
const content=location.search.includes('billing')?<BillingPage session={session}/>:location.search.includes('form')?<ChildOnboardingPage session={session} initialDraft={{...emptyProfileDraft,displayName:'合成版面驗收',baselineLevel:'basic'}}/>:<AppShell header={<ParentNavigation email="synthetic@example.invalid" onSignOut={()=>{}}/>}><div className="dashboard-container"><header className="dashboard-top-header"><h1>每個孩子，都有自己的下一步。</h1></header><ChildCard child={child} materials={[material]} onRefresh={()=>{}} onLoadMoreMaterials={()=>{}} hasMoreMaterials={false} releasedMaterialCount={1} loadingMoreMaterials={false} defaultExpanded/></div></AppShell>;
createRoot(document.getElementById('root')).render(content);
`)
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5180, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true })
const evidence = []
try {
  for (const width of [320, 390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror',error => errors.push(error.message))
    await page.route('http://127.0.0.1:54321/**', route => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      const response = name === 'get_enrollment_state' ? [{ status: 'open', capacity: 100, active_count: 1, remaining: 99, founding_limit: 30, founding_count: 0, free_pilot_active: true }]
        : name === 'can_open_parent_answer' ? false : name === 'get_student_material_submission' ? null
        : name === 'get_material_draft' ? [{answers:{},self_check:[],version:0,updated_at:null}]
        : name === 'get_child_assessment_overview' ? {childId:'00000000-0000-4000-8000-000000000001',status:'not_started',sessionId:null,itemsCompleted:0,targetItemCount:12,completedAt:null}
        : name === 'parent_child_learning_summary' ? {totalWeeks:1,vocabulary:{exposed:5,learning:5,evidenceMastered:0},grammar:{exposed:1,learning:1,evidenceMastered:0},communication:{exposed:0,learning:0,evidenceMastered:0},readingTrajectory:{},persistentWeakAreas:[],recentImprovements:[],masteryEvidenceExplanation:'合成範例，尚無精熟證據。'}
        : name === 'children' ? [{id:'synthetic-child',display_name:'合成版面驗收',grade:7,grade_stage:'grade_7',is_active:true,timezone:'Asia/Taipei',delivery_weekday:1,textbook_version:'翰林',next_generation_at:null,created_at:'2026-09-30'}]
        : name === 'subscriptions' ? [{id:'synthetic-subscription',child_id:'synthetic-child',status:'trialing',founding_status:'none',current_period_end:null,price_twd:null,plan_code:null,billing_interval:null,cancel_at_period_end:false}]
        : name === 'profiles' ? {terms_version:null}
        : []
      return route.fulfill({ contentType:'application/json',body:JSON.stringify(response) })
    })
    for (const path of ['/', '/sample', '/guide', '/about', '/privacy', '/terms', '/refund', '/waitlist', '/.runtime/layout-review.html', '/.runtime/layout-review.html?form', '/.runtime/layout-review.html?billing']) {
      await page.goto(`http://127.0.0.1:5180${path}`)
      await page.locator('h1').first().waitFor()
      const label = path.includes('.runtime') ? (path.includes('?form') ? 'profile-form' : path.includes('?billing') ? 'billing' : 'dashboard') : path.slice(1) || 'landing'
      if (label === 'billing') await page.getByRole('heading',{name:'合成版面驗收',exact:true}).waitFor()
      await page.waitForFunction(() => {
        let element = document.querySelector('h1')
        while (element) { if (Number(getComputedStyle(element).opacity) < 0.99) return false; element = element.parentElement }
        return true
      })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}))
      await page.screenshot({ path: `${output}/${width}-${label}-top.png` })
      if (path === '/') {
        await page.locator('#pricing').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/${width}-landing-pricing.png` })
      }
      if (path === '/sample') {
        await page.locator('#chapter-practice').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/${width}-sample-practice.png` })
      }
      if (label === 'dashboard') {
        await page.getByText('可開始閱讀與作答', { exact:false }).waitFor()
        await page.locator('.weekly-panel').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${output}/${width}-dashboard-week.png` })
      }
      if (label === 'profile-form') {
        for (const step of [2, 3]) {
          await page.getByRole('button', {name:'繼續',exact:true}).click()
          await page.getByText(`步驟 ${step} / 3`, {exact:true}).waitFor()
          await page.getByRole('heading',{name:step === 2 ? '孩子最近真的喜歡什麼？' : '最後，設定每週節奏',exact:true}).waitFor()
          await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.onboarding-heading').parentElement).opacity) >= 0.99)
          await page.screenshot({path:`${output}/${width}-profile-form-step${step}.png`})
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false)
        }
      }
      const overflow = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => {
        const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'absolute'
      }).slice(0, 15).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.slice(0, 100) })))
      evidence.push({ width, path, documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), overflow })
      assert.equal(evidence.at(-1).documentOverflow, false, `${width}px ${path} overflows`)
    }
    assert.deepEqual(errors, [], `${width}px page errors`)
    await page.close()
  }
  await writeFile(`${output}/measurements.json`, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
} finally { await browser.close(); await server.close() }

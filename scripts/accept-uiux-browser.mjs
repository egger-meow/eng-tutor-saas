// Synthetic/local UI acceptance. Never sends learner records or authentication email.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-uiux-acceptance'
const phase = process.argv[2] ?? 'before'
const output = resolve(`.runtime/uiux-acceptance/${phase}`)
await mkdir(output, {recursive:true})
await mkdir('apps/web/.runtime',{recursive:true})
await writeFile('apps/web/.runtime/uiux-acceptance.html','<div id="root"></div><script type="module" src="/.runtime/uiux-acceptance.tsx"></script>')
await writeFile('apps/web/.runtime/uiux-acceptance.tsx',`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {ChildOnboardingPage} from '../src/routes/ChildOnboardingPage';import {emptyProfileDraft} from '../src/lib/profile-form';
import {AppShell} from '../src/components/layout/AppShell';import {ParentNavigation} from '../src/components/layout/ParentNavigation';
import {QuestionRenderer} from '../src/components/materials/renderer/QuestionRenderer';import '../src/index.css';import '../src/App.css';
function Fixture(){const [answers,setAnswers]=useState({});return location.search.includes('form')?<ChildOnboardingPage session={{user:{id:'synthetic-parent',email:'synthetic@example.invalid'}}} initialDraft={{...emptyProfileDraft,displayName:'合成驗收',baselineLevel:'developing'}}/>:<AppShell header={<ParentNavigation onSignOut={()=>{}}/>}><div className="paper-reader-container"><h1>歷史表格題驗收</h1><QuestionRenderer question={{id:'legacy',prompt:'Compare the scenes.',responseLayout:{type:'organizer',headers:['Scene','Evidence'],rows:[{label:'First scene'}]}}} index={0} draftAnswers={answers} onAnswerChange={(key,value)=>setAnswers({...answers,[key]:value})}/></div></AppShell>};createRoot(document.getElementById('root')).render(<Fixture/>);
`)
const server = await createServer({root:resolve('apps/web'),server:{host:'127.0.0.1',port:5181,strictPort:true}})
await server.listen()
const browser = await chromium.launch({headless:true})
const evidence = []
try {
  for (const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:900},{width:320,height:900}]) {
    const page = await browser.newPage({viewport,reducedMotion:'reduce'})
    await page.route('http://127.0.0.1:54321/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('get_enrollment_state')?[{status:'open',capacity:100,active_count:1,remaining:99,founding_limit:30,founding_count:0,free_pilot_active:true}]:[])}))
    for (const path of ['/sample','/guide','/','/about','/privacy','/terms','/refund','/waitlist','/.runtime/uiux-acceptance.html?form','/.runtime/uiux-acceptance.html?legacy']) {
      await page.goto(`http://127.0.0.1:5181${path}`)
      await page.locator('h1').first().waitFor()
      await page.waitForFunction(()=>{let el=document.querySelector('h1');while(el){if(Number(getComputedStyle(el).opacity)<0.99)return false;el=el.parentElement}return true})
      await page.evaluate(()=>document.fonts.ready)
      const toggle = page.locator('.mobile-menu-toggle')
      if(path.includes('?form')) {
        const grades=page.getByRole('radiogroup',{name:'目前就學階段',exact:true})
        await grades.getByRole('radio',{name:'國一',exact:true}).press('ArrowRight')
        assert.equal(await grades.getByRole('radio',{name:'國二',exact:true}).getAttribute('aria-checked'),'true')
        await grades.getByRole('radio',{name:'國二',exact:true}).press('ArrowLeft')
      }
      if(path==='/sample') {
        const checkbox=page.locator('.self-check-checkbox').first()
        await checkbox.press('Space')
        assert.equal(await checkbox.isChecked(),true)
        await checkbox.press('Space')
      }
      if(path.includes('?legacy')) {
        const answer=page.getByRole('textbox',{name:'Compare the scenes.',exact:true})
        await answer.fill('First scene: my evidence.')
        assert.equal(await answer.inputValue(),'First scene: my evidence.')
      }
      const closedMenuHidden = !(await toggle.isVisible()) || await page.locator('.site-header nav a').first().evaluate(el=>getComputedStyle(el).visibility==='hidden')
      let escapeCloses = null, focusRestored = null
      if (await toggle.isVisible()) {
        await toggle.click()
        await page.locator('.site-header nav a').first().focus()
        await page.keyboard.press('Escape')
        escapeCloses = await toggle.getAttribute('aria-expanded') === 'false'
        focusRestored = await toggle.evaluate(el=>document.activeElement===el)
        if (!escapeCloses) await toggle.click()
      }
      await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}))
      await page.waitForTimeout(100)
      await page.locator('.wordmark').focus()
      await page.waitForTimeout(100)
      const focusedHeaderVisible = await page.locator('.wordmark').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight})
      const unnamedInputs = await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(els=>els.filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>({tag:el.tagName,id:el.id})))
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.scrollTo({top:0,behavior:'instant'})})
      await page.waitForTimeout(100)
      const enlargedOverflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
      const name = `${viewport.width}x${viewport.height}-${path.includes('form')?'form':path.includes('legacy')?'legacy':path.slice(1)||'landing'}`
      await page.screenshot({path:`${output}/${name}-large-text.png`})
      const overflowElements=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width && r.right>innerWidth+1 && getComputedStyle(el).visibility!=='hidden'}).slice(0,30).map(el=>({tag:el.tagName,class:el.className,text:el.textContent?.slice(0,50),width:el.getBoundingClientRect().width})))
      const result={viewport,path,closedMenuHidden,escapeCloses,focusRestored,focusedHeaderVisible,unnamedInputs,enlargedOverflow,overflowElements}
      evidence.push(result)
      if(path.includes('?form')) {
        for(const step of [2,3]) {
          await page.getByRole('button',{name:'繼續',exact:true}).click()
          await page.getByRole('heading',{name:step===2?'孩子最近真的喜歡什麼？':'最後，設定每週節奏',exact:true}).waitFor()
          await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.onboarding-heading').parentElement).opacity)>=0.99)
          const unnamed=await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(els=>els.filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>({tag:el.tagName,id:el.id})))
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
          await page.screenshot({path:`${output}/${name}-step${step}.png`})
          evidence.push({...result,path:`${path}:step${step}`,unnamedInputs:unnamed,enlargedOverflow:overflow})
        }
      }
    }
    await page.close()
  }
  await writeFile(`${output}/results.json`,JSON.stringify(evidence,null,2))
  console.log(JSON.stringify(evidence,null,2))
  if(phase!=='before') for(const result of evidence) {
    assert.notEqual(result.escapeCloses,false,`${result.path}: Escape leaves menu open`)
    assert.equal(result.closedMenuHidden,true,`${result.path}: closed menu is keyboard reachable`)
    assert.notEqual(result.focusRestored,false,`${result.path}: menu focus lost`)
    assert.equal(result.focusedHeaderVisible,true,`${result.path}: keyboard focus is offscreen`)
    assert.deepEqual(result.unnamedInputs,[],`${result.path}: unlabelled fields`)
    assert.equal(result.enlargedOverflow,false,`${result.viewport.width}px ${result.path}: 200% text overflow`)
  }
} finally {await browser.close();await server.close()}

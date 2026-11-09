// Real browser interactions with synthetic admin API responses; no production mutations.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from 'playwright'
const requireAdmin=createRequire(resolve('apps/admin/package.json'))
const {createServer}=await import(pathToFileURL(requireAdmin.resolve('vite')).href)
await mkdir('apps/admin/.runtime',{recursive:true});await mkdir('.runtime/test-mode-ui',{recursive:true})
await writeFile('apps/admin/.runtime/test-mode.html','<div id="root"></div><script type="module" src="/.runtime/test-mode.tsx"></script>')
await writeFile('apps/admin/.runtime/test-mode.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {GenerationTestModePanel} from '../src/components/timeline/GenerationTestModePanel';import '../src/index.css';import '../src/styles/cockpit.css';createRoot(document.getElementById('root')).render(<main style={{padding:12}}><GenerationTestModePanel childId="synthetic-child" onRefreshTimeline={()=>{}}/></main>);`)
const server=await createServer({configFile:false,root:resolve('apps/admin'),server:{host:'127.0.0.1',port:5184,strictPort:true}})
await server.listen();const browser=await chromium.launch({headless:true});const evidence=[]
try{
for(const width of [320,390,820,1440]){
const page=await browser.newPage({viewport:{width,height:900}});let failRead=false,blocked=false,resetCalls=0
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const status=()=>({success:true,childId:'synthetic-child',isEnabled:true,targetWeek:9,completedWeeksCount:3,currentMaterialWeek:'2026-09-13',nextJob:{id:'synthetic-job',status:'pending',attemptCount:0,maxAttempts:5},latestMaterial:{id:'synthetic-material',hasFeedback:true,observationsRecordedAt:'2026-09-13'},latestFeedback:{difficulty:5,completionRate:75,weakArea:'reading',parentComments:'Preserved synthetic parent observation',mistakesText:'Preserved synthetic mistakes',schoolProgressUpdate:'Preserved school progress'},advanceEligibility:{canAdvance:!blocked,blockingReason:blocked?'目前有生成工作進行中':null},resetEligibility:{canReset:!blocked,blockingReason:blocked?'目前有生成工作進行中，無法重設':null}})
await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let response=status(),code=200
if(path.endsWith('/status')&&failRead){code=503;response={message:'Synthetic unavailable'}}
else if(path.endsWith('/reset')){resetCalls++;response={success:false,error:'RESET_BLOCKED_ACTIVE_WORK',message:'目前有生成或發布工作進行中，請待工作完成後重設'}}
else if(!path.endsWith('/status'))throw Error('Unexpected mutation: '+path)
await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(response)})})
const go=()=>page.goto('http://127.0.0.1:5184/.runtime/test-mode.html')
await go();await page.getByRole('button',{name:'⚡ 推進 1 個測試週',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'⚡ 推進 1 個測試週',exact:true}).isEnabled(),true)
await page.getByRole('button',{name:'📝 填寫測試回饋',exact:true}).click();assert.equal(await page.getByPlaceholder('例如: 發現第 5 題閱讀理解需要多引導...').inputValue(),'Preserved synthetic parent observation');await page.getByRole('button',{name:'取消',exact:true}).click()
await page.getByRole('button',{name:'🔄 Reset to Onboarding (重設起點)',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(resetCalls,0,'cancel must not reset')
await page.getByRole('button',{name:'🔄 Reset to Onboarding (重設起點)',exact:true}).click();await page.getByRole('button',{name:'確認重設',exact:true}).click();assert.equal(resetCalls,1);await page.getByText('目前有生成或發布工作進行中，請待工作完成後重設',{exact:true}).waitFor()
blocked=true;await go();await page.getByText('重設受阻原因：目前有生成工作進行中，無法重設',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'🔄 Reset to Onboarding (重設起點)',exact:true}).isDisabled(),true)
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`admin overflow at ${width}`);await page.screenshot({path:resolve(`.runtime/test-mode-ui/${width}.png`),fullPage:true})
failRead=true;await go();await page.getByRole('button',{name:'重試狀態',exact:true}).waitFor();failRead=false;await page.getByRole('button',{name:'重試狀態',exact:true}).click();await page.getByText('重設受阻原因：目前有生成工作進行中，無法重設',{exact:true}).waitFor();assert.deepEqual(errors,[])
evidence.push({width,result:'PASS',backend:'synthetic admin API',scenarios:['feedback readback','reset cancel','reset blocked response','active work disables reset','status failure retry','no overflow']});await page.close()
}
await writeFile('.runtime/test-mode-ui/results.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2))
}finally{await browser.close();await server.close()}

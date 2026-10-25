// Real Chromium interactions against application components; synthetic stateful RPCs.
// No production records, email, generation jobs, or quota are modified.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const requireWeb = createRequire(resolve('apps/web/package.json'))
const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href)
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-feedback-flow'
const output = resolve('.runtime/feedback-flow')
await mkdir(output, { recursive: true })
await mkdir('apps/web/.runtime', { recursive: true })
await writeFile('apps/web/.runtime/feedback-flow.html', '<div id="root"></div><script type="module" src="/.runtime/feedback-flow.tsx"></script>')
await writeFile('apps/web/.runtime/feedback-flow.tsx', `
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {WeeklyLearningPanel} from '../src/components/dashboard/WeeklyLearningPanel';
import {MaterialHistoryItem} from '../src/components/materials/MaterialHistoryItem';
import {PaperReader} from '../src/components/materials/renderer/PaperReader';
import {AppShell} from '../src/components/layout/AppShell';import {ParentNavigation} from '../src/components/layout/ParentNavigation';
import {useRoute,navigate} from '../src/app/use-route';import {getSupabaseClient} from '../src/lib/supabase';
import '../src/index.css';import '../src/App.css';
const material={id:'synthetic-material',child_id:'synthetic-child',material_week:'2026-10-01',revision:1,week_number:3,student_pdf_path:'',parent_answer_pdf_path:'',generation_summary:{title:'合成驗收：聲音與故事'},created_at:'2026-10-01',release_at:'2026-10-01',answer_unlock_requires_submission:true,feedback:null};
const projection={material_id:material.id,child_id:material.child_id,child_name:'合成驗收',material_week:material.material_week,week_number:3,revision:1,title:'聲音與故事',student_pdf_path:'',release_at:material.release_at,student_lesson:{reading:{title:'Read and listen',blocks:[{type:'paragraph',text:'We hear a sound.'}]},practice:[{id:'practice',titleZh:'練習',questions:[{id:'q1',prompt:'Choose a sound.',options:['Music','Silence']},{id:'q2',prompt:'Write a sentence.'}]}]}};
function Fixture(){const route=useRoute();const [feedback,setFeedback]=useState(null);const [revision,setRevision]=useState(0);useEffect(()=>{getSupabaseClient().from('feedback').select('*').eq('material_id',material.id).maybeSingle().then(({data})=>setFeedback(data))},[revision,route.name]);window.__navigate=navigate;const current={...material,feedback,answer_unlock_requires_submission:!location.search.includes('paper')};return <AppShell header={<ParentNavigation onSignOut={()=>{}}/>}><main className="container scoped-material-page"><h1>合成驗收孩子的教材</h1>{route.name==='authenticated-material'?<PaperReader projection={projection}/>:location.search.includes('history')?<MaterialHistoryItem material={current} childName="合成驗收" onFeedbackSaved={()=>setRevision(n=>n+1)}/>:<WeeklyLearningPanel material={current} childName="合成驗收" onFeedbackSaved={()=>setRevision(n=>n+1)}/>}</main></AppShell>};createRoot(document.getElementById('root')).render(<Fixture/>);
`)
const server = await createServer({ root: resolve('apps/web'), server: { host: '127.0.0.1', port: 5183, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const [device, viewport] of [['desktop',{width:1440,height:1000}],['phone',{width:390,height:844}],['small-phone',{width:320,height:844}]]) {
    const context = await browser.newContext({viewport,reducedMotion:'reduce'})
    let submission = null, feedback = null, draft = {answers:{},self_check:[],version:0,updated_at:null}, requests=0, saves=0, failRead=false, failSave=false, failCheckin=false, requestState='pending', quota=false
    const errors=[]
    await context.route('http://127.0.0.1:54321/**', async route => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1)
      const body = route.request().method()==='POST'?route.request().postDataJSON():null
      let response=null, status=200
      if(name==='get_student_material_submission') { response=submission; if(failRead){status=503;response={message:'Synthetic unavailable'}} }
      else if(name==='get_material_draft') response=[draft]
      else if(name==='can_open_parent_answer') response=Boolean(submission)
      else if(name==='get_material_learning_checkin') {if(failCheckin){status=503;response={message:'Synthetic checkin unavailable'}}}
      else if(name==='get_parent_material_evidence_summary') response={source:submission?'student_submission':'none',submittedAt:submission?.submitted_at,objectiveCorrect:submission?1:0,objectiveIncorrect:0,unanswered:submission?1:0,openReview:0,reportedCompletionRate:feedback?.completion_rate??null,adjustmentNotes:[],targets:[]}
      else if(name==='feedback') response=feedback
      else if(name==='save_student_parent_feedback') { if(failSave){status=503;response={message:'Synthetic save unavailable'}}else{saves++;feedback={difficulty:body.p_difficulty,completion_rate:body.p_completion_rate,weak_area:body.p_weak_area,mistakes_text:body.p_mistakes_text,child_comments:body.p_child_comments,parent_comments:body.p_parent_comments,created_at:new Date().toISOString()}} }
      else if(name==='request_next_after_student_submission') {if(quota)response={requested:false,reason:'MONTHLY_LIMIT',used:4,limit:4};else{requests++;submission.next_requested=true;submission.next_request_status=requestState;response={requested:true}}}
      else if(name==='save_material_draft'){draft={answers:body.p_answers,self_check:body.p_self_check,version:draft.version+1,updated_at:new Date().toISOString()};response={success:true,...draft}}
      else if(name==='submit_student_material'){submission={...draft,submitted_at:new Date().toISOString(),next_requested:false,results:[{question_id:'q1',status:'correct',correct_answer:'Music'},{question_id:'q2',status:'unanswered',correct_answer:null}]};response=submission}
      else if(name==='get_enrollment_state')response=[{status:'open',capacity:100,active_count:1,remaining:99,founding_limit:30,founding_count:0,free_pilot_active:true}]
      else if(!['record_funnel_event','get_material_learning_navigation','record_material_learning_event','save_material_learning_navigation'].includes(name))throw Error('Unexpected RPC '+name)
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)})
    })
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept())
    const url='http://127.0.0.1:5183/.runtime/feedback-flow.html'
    const go=async suffix=>{await page.goto(url+(suffix??''));await page.getByRole('heading',{name:'合成驗收孩子的教材'}).waitFor()}
    const count=async text=>assert.equal(await page.getByText(text,{exact:false}).count(),0,text)
    const shot=async name=>{await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' overflow');await page.screenshot({path:resolve(output,device+'-'+name+'.png'),fullPage:true});if(name==='requested-reader')await page.locator('.material-next-step-panel').screenshot({path:resolve(output,device+'-next-step.png')});if(name==='dashboard-submitted')await page.locator('.weekly-panel').screenshot({path:resolve(output,device+'-dashboard-card.png')})}
    await go();await page.getByText('這份教材在開始上有遇到困難嗎？',{exact:true}).waitFor();await shot('unstarted')
    draft.updated_at=new Date().toISOString();draft.answers={q1:'A'}
    await go();await page.getByText('草稿已保存 · 繼續作答',{exact:true}).waitFor();await count('這份教材在開始上有遇到困難嗎？')
    // Use actual reader controls to submit a partial packet and request the next.
    await page.getByRole('link',{name:'查看／繼續本週教材',exact:true}).click()
    await page.getByRole('button',{name:'提交整份教材',exact:true}).click()
    await page.getByRole('button',{name:'申請下一份教材',exact:true}).waitFor()
    assert.equal(submission.results[1].status,'unanswered')
    await page.getByRole('button',{name:'略過回饋',exact:true}).click();assert.equal(saves,0)
    await page.getByRole('button',{name:'申請下一份教材',exact:true}).click()
    await page.getByText('已收到下一份教材申請',{exact:true}).waitFor()
    await page.getByRole('button',{name:'新增／修改家長觀察（選填）',exact:true}).waitFor()
    await shot('requested-reader')
    await go();await page.getByText('已提交 · 已申請下一份',{exact:true}).waitFor()
    await count('這份教材在開始上有遇到困難嗎？');await count('閱讀並提交教材後，可選填回饋');await count('預計 7 天後完成');await shot('dashboard-submitted')
    await page.getByRole('button',{name:'＋ 補充家長觀察／回饋（選填）',exact:true}).click()
    assert.equal(new URL(page.url()).pathname,'/.runtime/feedback-flow.html','feedback stays inline')
    await page.getByRole('button',{name:'＋ 有錯題或其他觀察想補充',exact:true}).click()
    const comment=page.getByRole('textbox',{name:'還有什麼學習觀察想補充？',exact:false})
    await comment.fill('合成測試：孩子希望多一點音樂故事。')
    const targets=page.locator('.evidence-targets-group');await targets.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await targets.getAttribute('open'),'');await page.keyboard.press('Enter');assert.equal(await targets.getAttribute('open'),null);await shot('dashboard-feedback')
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% text overflow');await page.evaluate(()=>document.documentElement.style.fontSize='')
    failSave=true;await page.getByRole('button',{name:'儲存回饋',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await comment.inputValue(),'合成測試：孩子希望多一點音樂故事。')
    failSave=false;await page.getByRole('button',{name:'儲存回饋',exact:true}).click();await page.getByRole('button',{name:'修改回饋',exact:true}).waitFor();assert.equal(requests,1);assert.equal(saves,1)
    await page.reload();await page.getByRole('button',{name:'修改回饋',exact:true}).click();assert.equal(await comment.inputValue(),feedback.parent_comments)
    await page.getByRole('radio',{name:'大部分完成',exact:true}).check();await comment.fill('合成測試：修改後的家長觀察。');await page.getByRole('button',{name:'儲存回饋',exact:true}).click();await page.getByRole('button',{name:'修改回饋',exact:true}).waitFor()
    await page.getByRole('link',{name:'查看／繼續本週教材',exact:true}).click()
    await page.getByRole('button',{name:'新增／修改家長觀察（選填）',exact:true}).click()
    const readerComment=page.getByRole('textbox',{name:'其他觀察（選填）',exact:true});await readerComment.waitFor();assert.equal(await readerComment.inputValue(),'合成測試：修改後的家長觀察。')
    await readerComment.fill('合成測試：從完成頁再次修改。');await page.getByRole('button',{name:'儲存回饋',exact:true}).click();await page.getByRole('button',{name:'修改家長觀察／回饋',exact:true}).click();assert.equal(await readerComment.inputValue(),feedback.parent_comments);assert.equal(requests,1);assert.equal(feedback.completion_rate,75,'reader preserves the parent-reported completion')
    await shot('reader-feedback')
    await go('?history');await page.getByRole('button',{name:'修改回饋',exact:true}).click();assert.equal(await comment.inputValue(),feedback.parent_comments);await shot('history-feedback')
    for(const state of ['failed','canceled']){submission.next_request_status=state;await go();await page.getByText('已提交 · 下一份未完成，請聯絡我們協助恢復',{exact:true}).waitFor();await page.getByRole('button',{name:'修改回饋',exact:true}).click();await page.getByRole('button',{name:'儲存回饋',exact:true}).waitFor();await page.getByRole('link',{name:'查看／繼續本週教材',exact:true}).click();await page.getByRole('button',{name:'新增／修改家長觀察（選填）',exact:true}).waitFor()}
    submission.next_requested=false;submission.next_request_status=null;quota=true;await go();await page.getByRole('link',{name:'查看／繼續本週教材',exact:true}).click();await page.getByRole('button',{name:'申請下一份教材',exact:true}).click();await page.getByText('達到每服務月教材上限',{exact:true}).waitFor();await page.getByRole('button',{name:'新增／修改家長觀察（選填）',exact:true}).click();await readerComment.waitFor();await shot('quota-feedback')
    failRead=true;await go();await page.getByText('進度暫時無法確認，仍可開啟教材',{exact:false}).waitFor();await count('這份教材在開始上有遇到困難嗎？');await page.getByRole('link',{name:'查看／繼續本週教材',exact:true}).waitFor();await shot('unknown-progress')
    failRead=false;await page.getByRole('button',{name:'重試進度',exact:true}).first().click();await page.getByRole('button',{name:'修改回饋',exact:true}).waitFor()
    submission=null;feedback=null;draft={answers:{},self_check:[],version:0,updated_at:null};failCheckin=true;await go();await page.getByText('可開始閱讀與作答',{exact:false}).waitFor();await count('這份教材在開始上有遇到困難嗎？')
    failCheckin=false;await go('?paper');await page.getByRole('button',{name:'紙筆做過了，填寫學習觀察',exact:true}).first().click();await page.getByRole('button',{name:'送出回饋並申請下一份',exact:true}).waitFor()
    assert.deepEqual(errors,[])
    results.push({device,viewport,result:'PASS',requests,saves,realBrowser:true,backend:'stateful synthetic RPC',actualDevice:false,scenarios:['unstarted','draft','partial submit','skip','request','inline add','save failure retry','reload readback','reader edit','history edit','failed/canceled','quota feedback','unknown/retry','checkin failure','legacy paper','keyboard details','200% text']})
    await context.close()
  }
  await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser.close();await server.close()}

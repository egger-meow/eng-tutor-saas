import { useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { StudentLessonRenderer } from '../components/materials/renderer/StudentLessonRenderer'
import { demoLesson, getDemoResults } from '../content/public-demo'
import { emptyDemoState, readDemoState, saveDemoState, type DemoState } from '../lib/public-demo-state'
import { handleInternalLink } from '../app/use-route'
import '../styles/public-demo.css'

export function SamplePage() {
  const [state, setState] = useState(readDemoState)
  const [saved, setSaved] = useState(true)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  function update(next: DemoState) { setState(next); setSaved(saveDemoState(next)) }
  function submit() { update({ ...state, submitted: true }); setConfirmSubmit(false) }
  function reset() {
    if (!window.confirm('清除這份公開範例的作答與結果，重新開始嗎？')) return
    update(emptyDemoState()); setConfirmSubmit(false)
  }
  return <AppShell header={<PublicHeader />}>
    <div className="sample-page public-demo">
      <header className="sample-intro">
        <p className="overline">不用登入，先試一份</p>
        <h1>讀一篇、試著答，再看結果。</h1>
        <p className="lede">線上閱讀與作答，也能下載空白教材列印。正式教材會依孩子的程度、學校進度、興趣與已提交表現調整。</p>
        <p className="sample-disclaimer">公開合成範例：故事與學習設定都是示範，不含真實孩子資料，也不是為你的孩子生成的個人化教材。範例答案屬公開內容；正式教材由伺服器管控，整份提交後才開放答案。</p>
        <p>體驗作答只留在這個瀏覽器，不會送到伺服器，不耗教材配額，也不會啟動生成。裝置朗讀使用瀏覽器可用語音；這裡的寫作是文字輸入。</p>
      </header>
      <div className="paper-reader-container">
        <div className="paper-reader-toolbar demo-toolbar" role="region" aria-label="範例工具列">
          <p role="status">{!saved ? '瀏覽器無法保存；目前作答只留在此頁，重新整理會遺失本次變更。' : state.submitted ? '已提交範例 · 作答已鎖定 · 只存本機' : '範例草稿自動保存在此瀏覽器'}</p>
          <div className="form-actions">
            <a className="button secondary" href="/samples/demo-student.pdf" target="_blank" rel="noreferrer">空白列印版 PDF</a>
            <button className="button secondary" type="button" onClick={reset}>清除並重新體驗</button>
          </div>
        </div>
        <StudentLessonRenderer lesson={demoLesson} answers={state.answers} selfCheck={state.selfCheck} readOnly={state.submitted}
          onAnswerChange={(key, value) => { if (!state.submitted) update({ ...state, answers: { ...state.answers, [key]: value } }) }}
          onToggleSelfCheck={(key) => { if (!state.submitted) update({ ...state, selfCheck: state.selfCheck.includes(key) ? state.selfCheck.filter((item) => item !== key) : [...state.selfCheck, key] }) }} />
        <section className="paper-sheet paper-completion" aria-labelledby="demo-completion-title">
          <h2 id="demo-completion-title">{state.submitted ? '範例提交結果' : '完成這份範例'}</h2>
          {!state.submitted ? <>
            <p>可以部分完成。未作答不算答錯；提交後才能在這裡看參考答案。範例提交後作答會鎖定，重新體驗可清除重做。</p>
            {!confirmSubmit ? <button className="button" type="button" onClick={() => setConfirmSubmit(true)}>提交整份範例</button>
              : <div role="group" aria-label="確認範例提交"><p>確定提交目前的作答嗎？</p><div className="form-actions">
                <button className="button" type="button" onClick={submit}>確認提交範例</button>
                <button className="button secondary" type="button" onClick={() => setConfirmSubmit(false)}>繼續作答</button>
              </div></div>}
          </> : <>
            <p>未作答不算答錯；開放題尚未評分，可用參考答案自行回顧。正式流程另有選填家長回饋，以及獨立的「申請下一份」動作，每服務月最多 4 份；此體驗不會申請教材。</p>
            <ul className="demo-results">{getDemoResults(state.answers).map((result) => <li key={result.questionId}>
              <a href={`#q-card-${result.questionId}`}>{result.prompt}</a>
              <p>{{ correct: '答對', incorrect: '答錯', unanswered: '未作答', open_review: '開放題尚未評分' }[result.status]}</p>
              {result.response && <p>你的作答：{result.response}</p>}
              <p>參考答案：{result.answer}</p><p>{result.explanation}</p>
            </li>)}</ul>
          </>}
        </section>
      </div>
      <section className="public-section">
        <h2>換成真正適合你孩子的教材</h2>
        <p>由家長帳號管理孩子。第一次使用先填學習資料，名額與方案以首頁即時狀態為準；已有帳號可直接登入，繼續本週教材。</p>
        <div className="form-actions">
          <a className="button" href="/#onboarding" onClick={handleInternalLink}>填寫孩子資料</a>
          <a className="button secondary" href="/#login" onClick={handleInternalLink}>已有帳號，登入看教材</a>
        </div>
      </section>
    </div>
    <PublicFooter />
  </AppShell>
}

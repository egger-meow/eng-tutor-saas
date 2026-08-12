import { addBasePath } from '../app/routes'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { sampleChild, samplePdfFiles } from '../content/sample-child'

function publicAsset(filename: string) {
  return addBasePath(`/samples/${filename}`, import.meta.env.BASE_URL)
}

export function SamplePage() {
  return <AppShell header={<PublicHeader />}><main className="sample-page">
    <header className="sample-intro"><p className="overline">一個孩子的資料，如何變成一週教材</p><h1>先看輸入，再看真正的產出。</h1><p className="lede">這不是通用講義換上一個孩子喜歡的主題。程度、學校進度、練習需求與興趣，一起決定文章難度、文法重點、題型與家長觀察方向。</p><p className="sample-disclaimer">以下人物與資料完全虛構，專供產品示範與系統測試。</p></header>
    <section className="sample-profile" aria-labelledby="sample-profile-title"><div><p className="overline">Sample profile</p><h2 id="sample-profile-title">{sampleChild.name}</h2><p>{sampleChild.grade}</p></div><dl>
      <div><dt>目前程度</dt><dd>{sampleChild.level}</dd></div><div><dt>學校進度</dt><dd>{sampleChild.schoolProgress}</dd></div><div><dt>已知優勢</dt><dd>{sampleChild.strengths}</dd></div><div><dt>本週需要</dt><dd>{sampleChild.needs.join('、')}</dd></div><div><dt>近期興趣</dt><dd>{sampleChild.interests.join('、')}</dd></div><div><dt>學習節奏</dt><dd>{sampleChild.routine}</dd></div>
    </dl></section>
    <section className="sample-reasoning" aria-labelledby="sample-reasoning-title"><p className="overline">Signals → decisions</p><h2 id="sample-reasoning-title">這些資料，真的改變了什麼？</h2><div className="sample-decisions">
      <article><span>01</span><h3>讀什麼</h3><p>以屋頂花園實驗寫成自然閱讀，而不是只把名字塞進制式文章。</p></article><article><span>02</span><h3>練什麼</h3><p>主旨、細節與推論搭配 do / does，正好承接學校進度與已知弱點。</p></article><article><span>03</span><h3>怎麼觀察</h3><p>家長解答會提示本週要留意的卡點，回饋再成為下一週的調整依據。</p></article>
    </div></section>
    <section className="sample-downloads" aria-labelledby="sample-downloads-title"><div><p className="overline">Actual output</p><h2 id="sample-downloads-title">下載完整的第一週範例</h2><p>兩份檔案都由正式 PDF pipeline 從同一份結構化教材產生。</p></div><div className="sample-file-list">
      <article><p>給孩子</p><h3>學生教材 PDF</h3><span>閱讀、單字、文法、練習與延後作業；不含答案。</span><a className="button" href={publicAsset(samplePdfFiles.student)} target="_blank" rel="noreferrer">開啟完整教材</a></article><article><p>給家長</p><h3>家長解答 PDF</h3><span>答案、簡短解析、本週重點與陪伴時可觀察的地方。</span><a className="button secondary" href={publicAsset(samplePdfFiles.parent)} target="_blank" rel="noreferrer">開啟完整解答</a></article>
    </div></section>
  </main></AppShell>
}

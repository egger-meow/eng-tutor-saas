import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { sampleChild, samplePdfFiles } from '../content/sample-child'
import { PageTransition } from '../components/motion/PageTransition'
import { FadeInUp } from '../components/motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'

function publicAsset(filename: string) {
  return `/samples/${filename}`
}

export function SamplePage() {
  return (
    <AppShell header={<PublicHeader />}>
      <PageTransition>
        <main className="sample-page">
          <header className="sample-intro">
            <FadeInUp>
              <p className="overline">一個孩子的資料，如何變成一週教材</p>
              <h1>先看輸入，再看真正的產出。</h1>
              <p className="lede">
                這不是通用講義換上一個孩子喜歡的主題。孩子的興趣、目前程度與學習目標，一起決定閱讀情境、文法重點、題型與家長觀察方向。
              </p>
              <p className="sample-disclaimer">以下只公開示範所需的學習資料；兩份 PDF 是正式流程實際產出的 Week 1 教材，未重新生成或修改。</p>
            </FadeInUp>
          </header>

          <FadeInUp delay={0.1}>
            <section className="sample-profile" aria-labelledby="sample-profile-title">
              <div>
                <p className="overline">Sample profile</p>
                <h2 id="sample-profile-title">{sampleChild.name}</h2>
                <p>{sampleChild.grade}</p>
              </div>
              <dl>
                <div>
                  <dt>目前程度</dt>
                  <dd>{sampleChild.level}</dd>
                </div>
                <div>
                  <dt>學習目標</dt>
                  <dd>{sampleChild.learningGoal}</dd>
                </div>
                <div>
                  <dt>近期興趣</dt>
                  <dd>{sampleChild.interests.join('、')}</dd>
                </div>
                <div>
                  <dt>學習節奏</dt>
                  <dd>{sampleChild.routine}</dd>
                </div>
              </dl>
            </section>
          </FadeInUp>

          <section className="sample-reasoning" aria-labelledby="sample-reasoning-title">
            <FadeInUp>
              <p className="overline">Signals → decisions</p>
              <h2 id="sample-reasoning-title">這些資料，真的改變了什麼？</h2>
            </FadeInUp>

            <StaggerContainer className="sample-decisions" staggerDelay={0.1}>
              <StaggerItem tag="article">
                <span>01</span>
                <h3>讀什麼</h3>
                <p>把 Minecraft、科技與解謎興趣轉化成方塊建造遊戲感的自動門故障排除閱讀，而不是把 Minecraft 這個名稱硬塞進文章。</p>
              </StaggerItem>
              <StaggerItem tag="article">
                <span>02</span>
                <h3>練什麼</h3>
                <p>用訊號、測試與結果練習找文章證據，並以 am / is / are 建立第一週的閱讀、字彙與基礎文法基線。</p>
              </StaggerItem>
              <StaggerItem tag="article">
                <span>03</span>
                <h3>怎麼觀察</h3>
                <p>家長解答會提示主詞與 be 動詞是否一致、孩子能否分清測試結果與結論，以及哪些核心字需要下週再複習。</p>
              </StaggerItem>
            </StaggerContainer>
          </section>

          <section className="sample-downloads" aria-labelledby="sample-downloads-title">
            <FadeInUp>
              <div>
                <p className="overline">Actual output</p>
                <h2 id="sample-downloads-title">下載完整的第一週範例</h2>
                <p>兩份檔案都由同一份結構化教材，經正式審稿與 PDF pipeline 產生。</p>
              </div>
            </FadeInUp>

            <StaggerContainer className="sample-file-list" staggerDelay={0.12}>
              <StaggerItem tag="article">
                <p>給孩子</p>
                <h3>學生教材 PDF</h3>
                <span>閱讀、單字、文法、練習與延後作業；不含答案。</span>
                <a
                  className="button"
                  href={publicAsset(samplePdfFiles.student)}
                  target="_blank"
                  rel="noreferrer"
                >
                  開啟完整教材
                </a>
              </StaggerItem>
              <StaggerItem tag="article">
                <p>給家長</p>
                <h3>家長解答 PDF</h3>
                <span>答案、簡短說明、本週重點與陪伴時可觀察的地方。</span>
                <a
                  className="button secondary"
                  href={publicAsset(samplePdfFiles.parent)}
                  target="_blank"
                  rel="noreferrer"
                >
                  開啟完整解答
                </a>
              </StaggerItem>
            </StaggerContainer>
          </section>
        </main>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}

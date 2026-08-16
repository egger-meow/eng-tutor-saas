import { addBasePath } from '../app/routes'
import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { sampleChild, samplePdfFiles } from '../content/sample-child'
import { PageTransition } from '../components/motion/PageTransition'
import { FadeInUp } from '../components/motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'

function publicAsset(filename: string) {
  return addBasePath(`/samples/${filename}`, import.meta.env.BASE_URL)
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
                這不是通用講義換上一個孩子喜歡的主題。程度、學校進度、已知卡點與興趣，一起決定文章難度、文法重點、題型與家長觀察方向。
              </p>
              <p className="sample-disclaimer">以下人物與資料完全虛構；這份 Week 1 已走過正式產生、審稿與 PDF pipeline，專供產品示範。</p>
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
                  <dt>學校進度</dt>
                  <dd>{sampleChild.schoolProgress}</dd>
                </div>
                <div>
                  <dt>已知優勢</dt>
                  <dd>{sampleChild.strengths}</dd>
                </div>
                <div>
                  <dt>本週需要</dt>
                  <dd>{sampleChild.needs.join('、')}</dd>
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
                <p>以 Minecraft 紅石自動門的測試情境寫成閱讀，而不是只把 Minecraft 這個詞塞進制式文章。</p>
              </StaggerItem>
              <StaggerItem tag="article">
                <span>02</span>
                <h3>練什麼</h3>
                <p>主旨、細節與推論搭配 do / does，正好承接學校進度，以及「Does 後動詞容易加 s」的已知弱點。</p>
              </StaggerItem>
              <StaggerItem tag="article">
                <span>03</span>
                <h3>怎麼觀察</h3>
                <p>家長解答會提示長句跳讀、證據定位與隔天提取等本週觀察點，回饋再成為下一週的調整依據。</p>
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

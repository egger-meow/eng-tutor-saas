import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FadeInUp } from '../components/motion/FadeInUp'
import { PageTransition } from '../components/motion/PageTransition'
import { legalConfig } from '../lib/config'

export function PrivacyPage() {
  return (
    <AppShell className="legal-page" header={<PublicHeader />}>
      <PageTransition>
        <div className="legal-container">
          <FadeInUp className="legal-header">
            <p className="eyebrow">法律與隱私政策</p>
            <h1>隱私權政策與個人資料蒐集告知</h1>
            <p className="legal-meta">
              版本號：{legalConfig.privacyVersion} ｜ 生效日期：2026 年 8 月 16 日
            </p>
          </FadeInUp>

          <article className="legal-content">
            <section>
              <h2>引言與承諾</h2>
              <p>
                歡迎使用「<strong>紙屬英文</strong>」（以下簡稱「本服務」或「本系統」）。我們深知家庭與孩子個人隱私之重要性，特別是涉及國小高年級至國中未成年學生的學習資料。本服務恪遵中華民國《個人資料保護法》（以下簡稱「個資法」）及相關主管機關法規，特此向您說明個人資料之蒐集、處理、利用、保存及保護措施。
              </p>
            </section>

            <section>
              <h2>一、法定告知事項（個資法第 8 條）</h2>
              <ol>
                <li>
                  <strong>公務／非公務機關名稱：</strong>紙屬英文營運團隊（法定營業主體資訊請參見文末經營者揭露）。
                </li>
                <li>
                  <strong>蒐集之目的：</strong>
                  <ul>
                    <li>提供每週個人化英文學習教材編製、難度校準與適性化生成服務。</li>
                    <li>會員帳號管理、身分驗證（Magic Link OTP）與學習檔案維護。</li>
                    <li>家長每週學習回饋收集、弱項追蹤與進度記憶維護。</li>
                    <li>訂閱方案管理、金流交易對帳、履約查核與客戶服務。</li>
                    <li>依法履行稅捐稽徵、會計帳務及爭議處理之法定義務。</li>
                  </ul>
                </li>
                <li>
                  <strong>個人資料之類別：</strong>
                  <ul>
                    <li><strong>家長／會員資料：</strong>電子郵件地址（Email）、稱謂／暱稱、條款審閱與同意紀錄、交易與訂閱紀錄。</li>
                    <li><strong>學生學習資料（未成年人）：</strong>孩子暱稱、就學階段（年級）、課本版本（南一／康軒／翰林）、通用學習興趣、學習弱項標記、作答回饋與單字／文法掌握進度。</li>
                    <li><strong>技術連線資料：</strong>連線 IP 位址、瀏覽器標頭（僅供資安防禦與連線中繼，不作廣告追蹤）。</li>
                  </ul>
                </li>
                <li>
                  <strong>個人資料利用之期間、地區、對象及方式：</strong>
                  <ul>
                    <li><strong>期間：</strong>自您註冊建立帳號起，至您主動註銷帳號或刪除孩子資料為止；涉及稅法與商業會計之交易紀錄依法律規定保存 5 至 7 年。</li>
                    <li><strong>地區：</strong>中華民國境內及本服務受託技術服務商（Supabase、Paddle、OpenAI 等）伺服器所在地。</li>
                    <li><strong>對象：</strong>紙屬英文營運團隊、本服務受託處理者（詳見第三方委託處理者清冊）及依法令有權調閱之政府主管機關或司法機關。</li>
                    <li><strong>方式：</strong>透過自動化演算法運算、資料庫關聯運算、私有加密雲端儲存與加密網路傳輸進行。</li>
                  </ul>
                </li>
                <li>
                  <strong>當事人依個資法第 3 條得行使之權利及方式：</strong>
                  <p>
                    家長隨時可就您本人或您受監護子女之個人資料行使下列權利：(1) 查詢或請求閱覽；(2) 請求製給複製本；(3) 請求補充或更正；(4) 請求停止蒐集、處理或利用；(5) 請求刪除。您可直接於會員後台進行資料更正或刪除孩子學習檔案，或透過客服信箱提出申請。
                  </p>
                </li>
                <li>
                  <strong>不提供個人資料之影響：</strong>
                  <p>
                    若您不提供家長 Email，將無法完成會員註冊與接收教材；若不提供孩子之年級與程度，系統將無法提供專屬個人化之教材編製服務。
                  </p>
                </li>
              </ol>
            </section>

            <section>
              <h2>二、未成年人保護與資料最小化原則 (Data Minimization)</h2>
              <p>
                紙屬英文堅持「科技負責個人化，學習回到紙上」之精神，嚴格實踐個人資料最小化原則：
              </p>
              <div className="legal-callout">
                <strong>我們明確承諾：</strong>
                <ul>
                  <li>❌ <strong>不收集真實姓名：</strong>孩子資料一律僅使用「暱稱」。</li>
                  <li>❌ <strong>不收集身分證字號與出生日期：</strong>僅記錄「就學年級階段」以對齊課綱。</li>
                  <li>❌ <strong>不收集就讀學校全名與住址：</strong>絕不刺探學生日常地理隱私。</li>
                  <li>❌ <strong>不要求上傳學生照片或個人肖像：</strong>教材純以文字、文法解說與插圖構成，不要求家長上傳孩子照片。</li>
                  <li>❌ <strong>禁止輸入敏感機敏資料：</strong>家長填寫興趣或備註時，請避免輸入任何涉及家庭隱私、醫療病歷或個人可識別資訊。</li>
                </ul>
              </div>
            </section>

            <section>
              <h2>三、人工智慧（AI）運算與受託資料處理者</h2>
              <p>
                本服務運用先進之演算法與商業級大型語言模型（如 OpenAI API）進行情境閱讀撰寫與文法提示編排。所有受託處理之第三方服務均經資安審查：
              </p>
              <ul>
                <li><strong>商業 API 絕不作為訓練用途：</strong>本系統傳輸至 AI 介面之資料僅包含去識別化之年級、課本單元、目標核心單字與通用興趣關鍵字。依官方商業 API 服務條款，該等資料<strong>絕不會</strong>被用於訓練任何公開基礎模型。</li>
                <li><strong>私有權限隔離 (Row Level Security)：</strong>所有資料庫均啟用 Supabase RLS，非資料所有人家長絕無法存取其他家庭之學習檔案或專屬 PDF。</li>
                <li><strong>金流獨立隔離：</strong>信用卡交易由符合 PCI-DSS Level 1 認證之 Paddle 處理，本服務系統不會接觸或留存完整信用卡號。</li>
              </ul>
            </section>

            <section>
              <h2>四、資料安全維護措施</h2>
              <p>
                我們採取符合國際標準之技術與組織措施維護個人資料安全：全站強制採用 TLS 1.3 加密連線傳輸；資料庫與儲存庫皆啟用靜態加密（AES-256）；教材 PDF 檔案僅透過具時效性之專屬安全簽署網址（Signed URL）供驗證通過之家長下載。
              </p>
            </section>

            <section>
              <h2>五、Cookie 與本地儲存說明</h2>
              <p>
                本網站僅使用維持使用者登入狀態（Session Token）及草稿暫存所必要之本機端技術儲存（LocalStorage / SessionStorage）。我們<strong>不使用</strong>任何跨網站追蹤型第三方廣告 Cookie。
              </p>
            </section>

            <section>
              <h2>六、經營者資訊與隱私聯絡窗口</h2>
              <p>
                若您對本隱私權政策有任何疑問、或欲行使個人資料當事人權利，請隨時與我們聯繫：
              </p>
              <div className="operator-card">
                <p><strong>服務名稱：</strong>紙屬英文（Paper English）</p>
                <p><strong>營運團隊：</strong>{legalConfig.companyName || 'jjmow (侯均頲)'}</p>
                <p><strong>客服與個資專用 Email：</strong><a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a></p>
                <p><strong>通訊地址：</strong>{legalConfig.companyAddress || '台灣新竹市'}</p>
              </div>
            </section>
          </article>
        </div>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}

import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FadeInUp } from '../components/motion/FadeInUp'
import { PageTransition } from '../components/motion/PageTransition'
import { legalConfig } from '../lib/config'

export function TermsPage() {
  return (
    <AppShell className="legal-page" header={<PublicHeader />}>
      <PageTransition>
        <div className="legal-container">
          <FadeInUp className="legal-header">
            <p className="eyebrow">服務合約與使用者條款</p>
            <h1>服務條款與定型化契約</h1>
            <p className="legal-meta">
              版本號：{legalConfig.termsVersion} ｜ 生效日期：2026 年 8 月 16 日
            </p>
          </FadeInUp>

          <article className="legal-content">
            <section className="review-period-notice">
              <div className="legal-callout legal-callout-important">
                <h3>【契約審閱權重要告知】</h3>
                <p>
                  依中華民國《消費者保護法》第 11 條之 1 及主管機關公告之定型化契約規範，本定型化契約條款已於官方網站公開提供消費者至少 <strong>3 日之合理審閱期間</strong>。請您於註冊、建立子女學習檔案或付費購買本服務前，詳閱本條款全部內容。當您點擊「註冊」、「同意」或「開始訂閱」時，即表示您已充分審閱並同意受本契約條款之拘束。
                </p>
              </div>
            </section>

            <section>
              <h2>第一條（契約當事人與適用範圍）</h2>
              <ol>
                <li>
                  <strong>企業經營者：</strong>紙屬英文（以下簡稱「本公司」或「本服務」，詳細經營主體資訊請參見文末揭露）。
                </li>
                <li>
                  <strong>消費者：</strong>指註冊會員並為其受監護未成年子女購買或使用本服務之家長或法定代理人（以下簡稱「家長」或「您」）。
                </li>
                <li>
                  <strong>契約適用：</strong>本契約適用於家長透過本公司指定網站系統（`eng-tutor-saas`）所使用之每週個人化英文學習教材生成、學習歷程記錄、回饋分析與相關線上輔助服務。
                </li>
              </ol>
            </section>

            <section>
              <h2>第二條（服務內容與交付方式）</h2>
              <ol>
                <li>
                  <strong>每週專屬教材：</strong>系統依據您提供之孩子年級、課本版本、已知弱項、興趣及每週作答回饋，每週動態演算並生成專屬之「學生教材 PDF（Student PDF）」與「家長解答 PDF（Parent Answer PDF）」。
                </li>
                <li>
                  <strong>交付方式與期日：</strong>教材產製完成後存放於本服務私有安全儲存庫，經由會員後台提供下載。完成孩子資料後，第一份專屬教材預計於隔天開放下載；後續教材依系統排程之每週固定週期交付。
                </li>
                <li>
                  <strong>紙本自主學習：</strong>本服務採「Paper-First」理念，家長下載後得自行列印於紙本供學生練習。本服務亦提供學習方法指引及 AI 提問原則引導。
                </li>
              </ol>
            </section>

            <section>
              <h2>第三條（收費標準與計費週期）</h2>
              <ol>
                <li>
                  <strong>計費單位：</strong>本服務以「個別孩子」為授權與計費單位。每位孩子擁有獨立之學習歷程與訂閱方案。
                </li>
                <li>
                  <strong>標準方案費用：</strong>
                  <ul>
                    <li><strong>月繳方案：</strong>每位孩子每期（1個月）新臺幣 499 元（NT$499）。</li>
                    <li><strong>年繳方案：</strong>每位孩子每期（1年）新臺幣 4,999 元（NT$4,999）。</li>
                  </ul>
                </li>
                <li>
                  <strong>創始早鳥優惠（Founding 30）：</strong>首批 30 位孩子享有第一週免費體驗；月繳方案第一個付費月特惠為新臺幣 299 元（NT$299），第二個付費月起恢復為標準月費 NT$499。
                </li>
                <li>
                  <strong>金流處理：</strong>本服務金流委由國際 Merchant of Record 服務商 Paddle.com 安全處理，交易收據及法定稅費依結帳明細開立。
                </li>
              </ol>
            </section>

            <section>
              <h2>第四條（通訊交易與數位內容退訂說明）</h2>
              <div className="legal-callout">
                <p>
                  本服務每週教材係依個別孩子之學習進度與回饋動態產製並提供下載之專屬數位內容：
                </p>
                <ul>
                  <li>依《消費者保護法》第 19 條及《通訊交易解除權合理例外情事適用準則》第 2 條，非以有形媒介提供之客製數位內容，於經消費者確認下單並開始提供後，其解約與退訂依本契約條款與法令規範辦理。</li>
                  <li>家長可隨時於使用者後台取消次期續訂；若有教材交付障礙或任何爭議，請隨時聯繫客服由專人協助處理。</li>
                </ul>
              </div>
            </section>

            <section>
              <h2>第五條（設備規格與服務品質擔保）</h2>
              <ol>
                <li>
                  <strong>系統需求：</strong>家長使用本服務需具備可連接網際網路之一般現代瀏覽器（如 Chrome, Safari, Edge, Firefox 最新版本）及可開啟／列印 PDF 檔案之軟硬體設備（如印表機）。
                </li>
                <li>
                  <strong>服務異常補償：</strong>若因本公司伺服器或系統重大障礙導致超過連續 48 小時無法下載當週教材，本公司將主動延長受影響孩子之服務授權天數或補發教材。
                </li>
              </ol>
            </section>

            <section>
              <h2>第六條（隨時終止契約與退費機制）</h2>
              <ol>
                <li>
                  <strong>隨時終止次期續訂：</strong>家長得隨時於會員後台「訂閱管理」頁面點選「取消續訂」以終止下一計費週期。取消後，本期已付款之服務權益與教材下載權限將完整保留至該計費期滿為止，次期起不再扣款。
                </li>
                <li>
                  <strong>中途終止退費規則：</strong>
                  <ul>
                    <li><strong>月繳方案：</strong>當月方案一旦開始製作並交付教材，當期費用不予退還；取消操作將自次月起生效。</li>
                    <li><strong>年繳方案：</strong>若家長於年繳合約期間內申請提前終止，已過期之月份依標準月費（NT$499/月）計算扣除已使用之期數後，將賸餘未開始履約之全月份費用無息按比例退還。</li>
                  </ul>
                </li>
                <li>
                  <strong>歷史教材保留：</strong>合約到期或終止後，已產製完成之歷史教材仍保留於帳戶中供家長查閱，孩子之學習歷程記憶亦將妥善封存，隨時歡迎續訂銜接。
                </li>
              </ol>
            </section>

            <section>
              <h2>第七條（智慧財產權與教材使用範圍）</h2>
              <ol>
                <li>
                  <strong>著作權歸屬：</strong>本服務系統、演算法、網站介面、視覺設計及產出之教材內容（包含閱讀文章、單字解析、練習題與家長說明）之智慧財產權均屬紙屬英文或依法授權本公司使用之權利人所有。
                </li>
                <li>
                  <strong>個人非商業使用授權：</strong>本公司僅授予家長及其指定之個別學生非專屬、不可轉讓之個人家庭學習使用權。嚴禁將教材用於補習班教學、商業轉售、大量重製、出租或公開散布。
                </li>
                <li>
                  <strong>第三方商標聲明：</strong>教材範例中所提及之第三方品牌（如 Minecraft 等）係引導學習興趣之指示性合理使用，相關商標權分屬各該權利人所有，本服務與各該權利人無官方贊助或合作關係。
                </li>
              </ol>
            </section>

            <section>
              <h2>第八條（個人資料保護與安全）</h2>
              <p>
                本公司蒐集、處理及利用家長與學生個人資料之詳細規範，請參閱本網站公告之《<a href="/privacy">隱私權政策</a>》，該隱私權政策構成本契約之一部分。
              </p>
            </section>

            <section>
              <h2>第九條（準據法與管轄法院）</h2>
              <ol>
                <li>
                  本契約之解釋、效力及履行均以<strong>中華民國法律</strong>為準據法。
                </li>
                <li>
                  因本契約所生之一切爭議，雙方應先秉持誠信原則協商解決；如涉訟時，雙方同意以<strong>臺灣臺北地方法院</strong>為第一審管轄法院。但法律另有專屬管轄規定（如《消費者保護法》第 47 條小額消費訴訟管轄）者，從其規定。
                </li>
              </ol>
            </section>

            <section>
              <h2>第十條（企業經營者法定資訊）</h2>
              <div className="operator-card">
                <p><strong>服務名稱：</strong>紙屬英文（Paper English）</p>
                <p><strong>營運主體：</strong>{legalConfig.companyName || '紙屬英文營運團隊'}</p>
                <p><strong>負責人：</strong>{legalConfig.representative || '依法登記代表人'}</p>
                <p><strong>統一編號：</strong>{legalConfig.taxId || '辦理中 / 依法揭露'}</p>
                <p><strong>客服信箱：</strong><a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a></p>
                <p><strong>營業地址：</strong>{legalConfig.companyAddress || '台灣（請以官方客服 Email 聯繫）'}</p>
              </div>
            </section>
          </article>
        </div>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}

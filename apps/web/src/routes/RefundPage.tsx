import { handleInternalLink } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FadeInUp } from '../components/motion/FadeInUp'
import { PageTransition } from '../components/motion/PageTransition'
import { legalConfig } from '../lib/config'

export function RefundPage() {
  return (
    <AppShell className="legal-page" header={<PublicHeader />}>
      <PageTransition>
        <div className="legal-container">
          <FadeInUp className="legal-header">
            <p className="eyebrow">退款與取消說明</p>
            <h1>退款政策 / Refund Policy</h1>
            <p className="legal-meta">本政策為《服務條款與定型化契約》退款與取消規則之摘要</p>
          </FadeInUp>

          <article className="legal-content">
            <section>
              <div className="legal-callout legal-callout-important">
                <h3>取消續訂不影響本期權益</h3>
                <p>家長可隨時於會員後台「訂閱管理」頁面取消次期續訂。取消後，本期已付款之服務權益與教材下載權限完整保留至計費期滿，次期起不再扣款。</p>
              </div>
            </section>

            <section>
              <h2>月繳方案</h2>
              <p>月繳方案當期一旦開始製作並交付教材，當期費用不予退還；取消操作自次月起生效。若尚未取消，方案將依原訂閱週期續訂。</p>
            </section>

            <section>
              <h2>年繳方案提前終止</h2>
              <p>家長於年繳合約期間內申請提前終止時，已過期月份依標準月費 NT$499／月計算並扣除已使用期數，賸餘尚未開始履約之全月份費用將無息按比例退還。</p>
            </section>

            <section>
              <h2>專屬數位內容交付</h2>
              <p>本服務每週教材會依個別孩子的學習進度與回饋動態產製，並以會員後台下載方式提供專屬數位內容。此類非以有形媒介提供之客製數位內容，經家長確認下單並開始提供後，其解約與退訂依服務條款及適用法令辦理。</p>
              <p>若因本公司伺服器或系統重大障礙，導致連續超過 48 小時無法下載當週教材，本公司將主動延長受影響孩子之服務授權天數或補發教材。</p>
            </section>

            <section>
              <h2>如何申請取消、退款或支援</h2>
              <ol>
                <li>取消次期續訂：登入會員後台，前往「訂閱管理」並選擇「取消續訂」。</li>
                <li>申請年繳提前終止、退款，或反映教材交付障礙與交易爭議：請寄信至客服信箱 <a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>，並提供帳戶 Email、孩子檔案名稱及訂閱／交易資訊，以便核對處理。</li>
              </ol>
            </section>

            <section>
              <h2>與服務條款的關係</h2>
              <p>本頁是退款與取消規則的便捷摘要，不取代完整契約。其他適用條件請參閱《<a href="/terms" onClick={handleInternalLink}>服務條款與定型化契約</a>》；如本摘要與完整契約有疑義，以完整契約及適用法令為準。</p>
            </section>
          </article>
        </div>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}

import { founderContent } from '../../content/site'

export function FounderProfile() {
  if (!founderContent.isPublished) return <section className="founder-pending"><p className="overline">資料審核中</p><h1>關於作者</h1><p>完整背景、照片、聯絡方式與已遮蔽個資的會考成績證明，會在本人逐項確認後公開。現在先不刊登任何未驗證的個人聲明。</p><h2>為什麼做這個產品</h2><p>{founderContent.philosophy}</p></section>
  return <div className="container founder-profile">
    <section className="public-section founder-summary founder-composed">
      <div>
        <img className="founder-brand-art" src="/founder/jjmow-brand.png" alt="紙屬英文創作者 JJmow 老師，英文家教 × 系統開發。我可以，你也可以。把學習的方法，做成陪你進步的系統。陽明交大數據所碩士班，管科與資工雙主修。" width="1536" height="1024" />
        <p className="overline">{founderContent.name} · {founderContent.shortBio}</p>
      </div>
      <div className="founder-story">
        <p className="overline">認識紙屬英文背後的人</p>
        <h1>你好，我是 {founderContent.displayName}。</h1>
        <p>{founderContent.fullBio}</p>
        <h2>先看孩子怎麼想，再決定下一步。</h2>
        <p>一對一教學讓我重視孩子卡住的原因：是觀念還不清楚、題意沒讀懂，還是需要再練習一次？我希望練習能回應這些差異，也讓家長知道下一步可以怎麼陪伴。</p>
        <p>我把教學經驗與軟體開發結合，做成紙屬英文。孩子可以在線上讀與答，也能把教材印下來；作答與回饋則成為後續教材調整的依據。</p>
        <p className="founder-belief">{founderContent.philosophy}</p>
        <h2>我的教學與作品</h2>
        <a href={founderContent.tutoringWebsite} target="_blank" rel="noreferrer">教學方式與背景證明 ↗</a>
        <a href={founderContent.website} target="_blank" rel="noreferrer">完整背景與作品集 ↗</a>
        <a className="button button-primary" href="/#samples">看看紙屬英文的教材</a>
      </div>
    </section>
  </div>
}


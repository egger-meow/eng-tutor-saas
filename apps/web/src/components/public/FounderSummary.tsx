export function FounderSummary() {
  return (
    <section className="public-section founder-summary" id="founder" aria-labelledby="founder-summary-title">
      <div className="founder-heading">
        <p className="overline">誰在做這套教材？</p>
        <h2 id="founder-summary-title">懂教學現場，也把 AI 做成真正能持續運作的系統。</h2>
      </div>
      <div className="founder-story">
        <p>我是紙屬英文的創作者，也是一名英文家教。這套服務從實際家教過程裡出發：孩子願意讀什麼、真正卡在哪裡，以及家長怎麼在不必備課的情況下幫上忙。</p>
        <p>我畢業於國立陽明交通大學，跨足管理、資訊與資工領域，目前錄取陽明交大數據科學與工程研究所；曾於台積電擔任軟體工程實習生，也持續投入 NLP、LLM、Agent 與產品開發。</p>
        <p className="founder-belief">我相信 AI 最有價值的位置，不是替孩子完成作業，而是記住學習軌跡、協助做出更好的教材，讓孩子把真正的能力練起來。</p>
        <a href="https://egger-meow.github.io/Me/" target="_blank" rel="noreferrer">查看創作者個人網站 ↗</a>
      </div>
      <div className="founder-evidence" aria-label="創作者照片與學業紀錄預留位置">
        <div className="image-placeholder"><span>Creator portrait</span><small>創作者大頭照待補</small></div>
        <div className="image-placeholder"><span>Academic / exam record</span><small>學業與會考紀錄待補</small></div>
      </div>
    </section>
  )
}

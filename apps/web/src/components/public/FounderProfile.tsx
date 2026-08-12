import { founderContent } from '../../content/site'

export function FounderProfile() {
  if (!founderContent.isPublished) return <section className="founder-pending"><p className="overline">資料審核中</p><h1>關於作者</h1><p>完整背景、照片、聯絡方式與已遮蔽個資的會考成績證明，會在本人逐項確認後公開。現在先不刊登任何未驗證的個人聲明。</p><h2>為什麼做這個產品</h2><p>{founderContent.philosophy}</p></section>
  return null
}


import type { ProfileDraft } from '../../../lib/profile-form'
import type { OnboardingStepProps } from '../step-types'

type InterestKey = 'favoriteStories' | 'favoriteGames' | 'favoriteMusic' | 'activities' | 'currentFascinations' | 'changedInterests'

const fields: Array<{ key: InterestKey; title: string; hint: string }> = [
  { key: 'favoriteStories', title: '最近喜歡的動漫、電影、書或頻道', hint: '例如：排球少年、葬送的芙莉蓮、Kurzgesagt；可一行寫一個' },
  { key: 'favoriteGames', title: '喜歡玩的遊戲', hint: '例如：Minecraft 生存模式、Roblox Doors、寶可夢對戰' },
  { key: 'favoriteMusic', title: '喜歡的音樂、歌手或樂器', hint: '例如：YOASOBI、周杰倫、正在學爵士鼓' },
  { key: 'activities', title: '正在學或常做的活動', hint: '例如：跆拳道藍帶、籃球校隊、畫電繪、自己組電腦' },
  { key: 'currentFascinations', title: '最近特別著迷或一直在研究的事', hint: '越具體越好，例如：F1 賽車進站策略、黑洞、養守宮' },
  { key: 'changedInterests', title: '最近新喜歡或已經沒興趣的內容', hint: '例如：最近開始看 One Piece；暫時不想再讀恐龍主題' },
]

export function InterestsStep({ draft, update }: OnboardingStepProps) {
  return <>
    <div className="interest-intro"><strong>不用全部填。</strong><p>寫一兩項孩子真的會聊的東西就很有幫助；興趣負責讓內容好讀，程度與錯題才決定要練什麼。</p></div>
    {fields.map((field) => <label key={field.key}>{field.title} <span className="optional">選填</span><textarea maxLength={1200} placeholder={field.hint} value={draft[field.key]} onChange={(event) => update({ [field.key]: event.target.value } as Partial<ProfileDraft>)} /></label>)}
    <label>不喜歡、害怕或希望避免的內容 <span className="optional">選填</span><textarea maxLength={1200} placeholder="例如：不要恐怖圖片、暫時避免寵物死亡情節" value={draft.dislikedTopics} onChange={(event) => update({ dislikedTopics: event.target.value })} /></label>
  </>
}

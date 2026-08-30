import { useState, type FormEvent } from 'react'
import { buildAuthRedirectUrl } from '../../lib/auth-redirect'
import { getSupabaseClient } from '../../lib/supabase'
import { clearPendingLegalAcceptance, recordPendingLegalAcceptance } from '../../lib/legal-acceptance'
import { getAnonymousId, trackEmailSubmit } from '../../lib/analytics'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    recordPendingLegalAcceptance()
    const anonymousId = getAnonymousId()
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(window.location.origin, { aid: anonymousId }),
      },
    })
    setBusy(false)
    if (error) {
      clearPendingLegalAcceptance()
      setNotice({ kind: 'error', text: error.message })
    } else {
      trackEmailSubmit()
      setNotice({ kind: 'success', text: '登入連結已寄出，請回到 Email 信箱完成登入。' })
    }
  }


  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <p className="overline">家長 Email</p>
      <h2 id="auth-title">建立帳號或登入</h2>
      <p className="muted">第一次使用：輸入 Email 建立家長帳號。已有帳號：輸入原本 Email，我們會寄送登入連結，不需要密碼。</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <p className="auth-legal-consent">
          點擊送出即代表您已審閱並同意紙屬英文的 <a href="/terms" target="_blank" rel="noreferrer">服務條款</a> 與 <a href="/privacy" target="_blank" rel="noreferrer">隱私權政策</a>。
        </p>
        <button className="button" type="submit" disabled={busy}>{busy ? '寄送中…' : '寄送安全連結，繼續填寫'}</button>
      </form>
      {notice && <p className={`notice notice-${notice.kind}`} role="status">{notice.text}</p>}
    </section>
  )
}

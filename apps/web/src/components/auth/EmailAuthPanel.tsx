import { useState, type FormEvent } from 'react'
import { buildAuthRedirectUrl } from '../../lib/auth-redirect'
import { getSupabaseClient } from '../../lib/supabase'
import { clearPendingLegalAcceptance, recordPendingLegalAcceptance } from '../../lib/legal-acceptance'
import { getAnonymousId, trackEmailSubmit } from '../../lib/analytics'

export type EmailAuthPanelProps = {
  id?: string
  inputId?: string
  overline?: string
  title?: string
  description?: string
  buttonText?: string
  className?: string
}

export function EmailAuthPanel({
  id,
  inputId,
  overline = '家長登入',
  title = '已有帳號？直接登入',
  description = '輸入原本使用的家長 Email，我們會寄送無密碼登入連結，直接回到孩子管理畫面。不需要重新填寫孩子資料。',
  buttonText = '寄送登入連結',
  className = '',
}: EmailAuthPanelProps = {}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const resolvedInputId = inputId ?? (id ? `${id}-email` : 'email')

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
      trackEmailSubmit({ flow: 'direct_login' })
      setNotice({ kind: 'success', text: '登入連結已寄出，請回到 Email 信箱完成登入。' })
    }
  }

  return (
    <section className={`auth-panel ${className}`.trim()} id={id} aria-labelledby="auth-title">
      {overline && <p className="overline">{overline}</p>}
      <h2 id="auth-title">{title}</h2>
      <p className="muted">{description}</p>
      <form onSubmit={submit}>
        <label htmlFor={resolvedInputId}>家長 Email</label>
        <input id={resolvedInputId} name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <p className="auth-legal-consent">
          點擊送出即代表您已審閱並同意紙屬英文的 <a href="/terms" target="_blank" rel="noreferrer">服務條款</a> 與 <a href="/privacy" target="_blank" rel="noreferrer">隱私權政策</a>。
        </p>
        <button className="button" type="submit" disabled={busy}>{busy ? '寄送中…' : buttonText}</button>
      </form>
      {notice && <p className={`notice notice-${notice.kind}`} role="status">{notice.text}</p>}
    </section>
  )
}

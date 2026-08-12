import { useEffect, useState } from 'react'
import { navigate } from '../../app/use-route'
import { getEnrollmentState, type EnrollmentState } from '../../lib/enrollment'

export function CapacityStatus() {
  const [state, setState] = useState<EnrollmentState | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => { void getEnrollmentState().then(setState).catch(() => setError(true)) }, [])
  if (error) return <p className="muted" role="status">即時名額暫時無法顯示；仍可登入留下聯絡方式。</p>
  if (!state) return <p className="muted" role="status">正在確認目前名額…</p>
  if (state.status === 'open' && state.remaining > 0) return <div className="capacity-status status-open"><strong>目前開放加入</strong><span>尚有 {state.remaining} 個名額（上限 {state.capacity} 位孩子）</span></div>
  return <div className="capacity-status status-waitlist"><strong>{state.status === 'closed' ? '目前暫停招生' : '目前名額已滿'}</strong><span>可先登記候補；有名額時再通知，不會先收費。</span><a className="button button-secondary" href="/waitlist" onClick={(event) => { event.preventDefault(); navigate('/waitlist') }}>登記候補</a></div>
}

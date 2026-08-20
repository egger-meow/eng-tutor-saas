import { navigate } from '../../app/use-route'
import { useEnrollmentState } from '../../lib/enrollment'

export function CapacityStatus() {
  const { state, error } = useEnrollmentState()
  if (error) return <p className="muted" role="status">目前無法讀取即時名額，仍可登入留下聯絡方式。</p>
  if (!state) return <p className="muted" role="status">正在確認目前名額…</p>
  if (state.status === 'open' && state.remaining > 0) return <div className="capacity-status status-open"><strong>目前開放加入</strong><span>已有 {state.activeCount} 位孩子加入，還剩 {state.remaining} 個名額（上限 {state.capacity} 位孩子）</span></div>
  return (
    <div className="capacity-status status-waitlist">
      <strong>{state.status === 'closed' ? '目前暫停招生' : '目前名額已滿'}</strong>
      <span>目前名額已滿。可以先建立帳號並填寫孩子的學習資料，不會收費。有名額開放時，我們會寄 Email 通知你，再決定是否訂閱。</span>
      <a className="button button-secondary" href="/waitlist" onClick={(event) => { event.preventDefault(); navigate('/waitlist') }}>登記候補</a>
    </div>
  )
}

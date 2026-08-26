import { navigate } from '../../app/use-route'
import { useEnrollmentState, type EnrollmentState } from '../../lib/enrollment'

export function CapacityStatus({ enrollment: propEnrollment }: { enrollment?: EnrollmentState | null } = {}) {
  const { state: hookState, error } = useEnrollmentState(propEnrollment)
  const state = propEnrollment !== undefined ? propEnrollment : hookState
  if (error) return <p className="muted" role="status">目前無法讀取即時名額，仍可登入留下聯絡方式。</p>
  if (!state) return <p className="muted" role="status">正在確認目前名額…</p>
  if (state.status === 'open' && state.remaining > 0) {
    return (
      <div className="capacity-status status-open">
        <div className="capacity-status-content">
          <div className="capacity-status-headline">
            <strong>目前開放加入</strong>
            <span>第一階段預計服務 <strong>{state.capacity} 位孩子</strong>，目前已有 <strong>{state.activeCount} 位加入</strong>。</span>
          </div>
          <span className="capacity-status-note">額滿後新加入者會先進入候補，既有家庭不受影響。</span>
        </div>
      </div>
    )
  }
  return (
    <div className="capacity-status status-waitlist">
      <strong>{state.status === 'closed' ? '目前暫停招生' : '目前名額已滿'}</strong>
      <span>目前名額已滿。可以先建立帳號並填寫孩子的學習資料，不會收費。有名額開放時，我們會寄 Email 通知你，再決定是否訂閱。</span>
      <a className="button button-secondary" href="/waitlist" onClick={(event) => { event.preventDefault(); navigate('/waitlist') }}>登記候補</a>
    </div>
  )
}

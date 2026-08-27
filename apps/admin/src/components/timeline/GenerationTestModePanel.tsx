import React, { useState, useEffect, useCallback } from 'react'
import type {
  GenerationTestModeStatus,
  AdminTestFeedbackInput,
} from '../../client/types.js'
import { adminApi } from '../../client/api.js'

interface GenerationTestModePanelProps {
  childId: string
  initialStatus?: GenerationTestModeStatus | null
  onRefreshTimeline: () => void
}

export const GenerationTestModePanel: React.FC<GenerationTestModePanelProps> = ({
  childId,
  initialStatus = null,
  onRefreshTimeline,
}) => {
  const [status, setStatus] = useState<GenerationTestModeStatus | null>(
    () => initialStatus || adminApi.getCachedTestModeStatus(childId) || null
  )
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Feedback Modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<number>(3)
  const [feedbackCompletion, setFeedbackCompletion] = useState<number>(100)
  const [feedbackWeakArea, setFeedbackWeakArea] = useState<string>('mixed')
  const [feedbackMistakes, setFeedbackMistakes] = useState<string>('')
  const [feedbackChildComments, setFeedbackChildComments] = useState<string>('')
  const [feedbackParentComments, setFeedbackParentComments] = useState<string>('')
  const [feedbackSchoolProgress, setFeedbackSchoolProgress] = useState<string>('')
  const [feedbackInterestUpdate, setFeedbackInterestUpdate] = useState<string>('')

  // Reset Confirmation Modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [targetWeekInput, setTargetWeekInput] = useState<number>(() => initialStatus?.targetWeek || 9)

  // Synchronize when initialStatus or childId changes
  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus)
      if (initialStatus.targetWeek) {
        setTargetWeekInput(initialStatus.targetWeek)
      }
    } else if (childId) {
      const cached = adminApi.getCachedTestModeStatus(childId)
      if (cached) {
        setStatus(cached)
        if (cached.targetWeek) {
          setTargetWeekInput(cached.targetWeek)
        }
      }
    }
  }, [childId, initialStatus])

  const fetchStatus = useCallback(async (silent = false) => {
    if (!childId) return
    if (!silent) setLoading(true)
    try {
      const res = await adminApi.getTestModeStatus(childId)
      setStatus(res)
      if (res.targetWeek) {
        setTargetWeekInput(res.targetWeek)
      }
    } catch (err) {
      console.error('Failed to load test mode status:', err)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    const hasInitial = Boolean(initialStatus || adminApi.getCachedTestModeStatus(childId))
    fetchStatus(hasInitial)
  }, [childId, fetchStatus])

  const handleEnableTestMode = async () => {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await adminApi.enableTestMode(childId, targetWeekInput)
      if (res.success) {
        setActionMessage({ type: 'success', text: `已成功啟用 生成測試模式 (目標週次: Week ${targetWeekInput})` })
        await fetchStatus()
        onRefreshTimeline()
      } else {
        setActionMessage({ type: 'error', text: res.message || res.error || '啟用失敗' })
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisableTestMode = async () => {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await adminApi.disableTestMode(childId, false)
      if (res.success) {
        setActionMessage({ type: 'success', text: '已結束 生成測試模式' })
        await fetchStatus()
        onRefreshTimeline()
      } else {
        setActionMessage({ type: 'error', text: res.message || res.error || '結束測試模式失敗' })
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdvanceWeek = async () => {
    if (actionLoading) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await adminApi.advanceTestWeek(childId)
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `✓ 已成功推進一週！下一週生成任務 (${res.jobId?.slice(0, 8)}) 已加速排程，可由 ChatGPT Scheduled Worker 立即領取。`,
        })
        await fetchStatus()
        onRefreshTimeline()
      } else {
        setActionMessage({ type: 'error', text: res.message || res.error || '推進失敗' })
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!status?.latestMaterial?.id) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const payload: AdminTestFeedbackInput = {
        childId,
        materialId: status.latestMaterial.id,
        difficulty: feedbackDifficulty,
        completionRate: feedbackCompletion,
        weakArea: feedbackWeakArea as any,
        mistakesText: feedbackMistakes.trim() || null,
        childComments: feedbackChildComments.trim() || null,
        parentComments: feedbackParentComments.trim() || null,
        schoolProgressUpdate: feedbackSchoolProgress.trim() || null,
        interestUpdate: feedbackInterestUpdate.trim() || null,
      }
      const res = await adminApi.recordTestFeedback(payload)
      if (res.success) {
        setShowFeedbackModal(false)
        setActionMessage({ type: 'success', text: '✓ 測試學習反饋已成功記錄！下一週任務已具備即時領取資格，ChatGPT Scheduled Worker 可立即領取生成。' })
        await fetchStatus()
        onRefreshTimeline()
      } else {
        setActionMessage({ type: 'error', text: res.message || res.error || '記錄反饋失敗' })
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetConfirm = async () => {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await adminApi.resetTestChildToOnboarding(childId)
      if (res.success) {
        setShowResetModal(false)
        let msg = '✓ 已成功重設回開通起點 （重設至開通起點）！所有歷史教材與記憶已清理，並重新建立 第 1 週 任務。'
        if (res.storageCleanupWarning) {
          msg += ' (儲存清理警告: 部分 PDF 檔案可能需手動清除)'
        }
        setActionMessage({ type: 'success', text: msg })
        await fetchStatus()
        onRefreshTimeline()
      } else {
        setActionMessage({ type: 'error', text: res.message || res.error || '重設失敗' })
        setShowResetModal(false)
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
      setShowResetModal(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePreviewPdf = async (type: 'student' | 'parent') => {
    if (!status?.latestMaterial?.id) return
    try {
      const res = await adminApi.getTestPdfSignedUrl(childId, status.latestMaterial.id, type)
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer')
      } else {
        alert(res.message || res.error || '無法取得 PDF 預覽連結')
      }
    } catch (err) {
      alert(`取得預覽失敗: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (loading && !status) {
    return (
      <div className="cockpit-card" style={{ marginBottom: '20px', padding: '16px', color: 'var(--text-muted)' }}>
        載入測試模式狀態...
      </div>
    )
  }

  const isEnabled = Boolean(status?.isEnabled)
  const canAdvance = Boolean(status?.advanceEligibility?.canAdvance)
  const advanceBlockingReason = status?.advanceEligibility?.blockingReason
  const canReset = Boolean(status?.resetEligibility?.canReset)

  return (
    <div
      className="cockpit-card"
      style={{
        marginBottom: '20px',
        border: isEnabled ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
        background: isEnabled ? 'rgba(139, 92, 246, 0.04)' : 'rgba(255, 255, 255, 0.01)',
      }}
    >
      {/* Top Bar / Mode Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🧪</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.5px' }}>
                GENERATION TEST MODE
              </span>
              {isEnabled ? (
                <span className="status-pill active" style={{ background: '#7c3aed', color: '#fff', fontSize: '11px' }}>
                  ACTIVE (已啟用)
                </span>
              ) : (
                <span className="status-pill" style={{ background: '#334155', color: '#94a3b8', fontSize: '11px' }}>
                  DISABLED (未啟用)
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              長週期測試控制台：忽略時間排程與訂閱限制，填寫回饋後 Worker 可立即領取生成。（全系統限單一測試學員，預設 Pax）
            </p>
          </div>
        </div>

        {!isEnabled ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>目標週次:</label>
            <select
              value={targetWeekInput}
              onChange={(e) => setTargetWeekInput(Number(e.target.value))}
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16].map((w) => (
                <option key={w} value={w}>第 {w} 週</option>
              ))}
            </select>
            <button
              type="button"
              className="refresh-btn"
              style={{ background: '#7c3aed', color: '#fff', borderColor: '#8b5cf6', fontWeight: 600, padding: '6px 14px', fontSize: '12px' }}
              onClick={handleEnableTestMode}
              disabled={actionLoading}
            >
              {actionLoading ? '啟用中...' : '啟用測試模式'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="refresh-btn"
              style={{ background: 'transparent', color: '#94a3b8', borderColor: '#475569', fontSize: '12px', padding: '5px 12px' }}
              onClick={handleDisableTestMode}
              disabled={actionLoading}
            >
              {actionLoading ? '處理中...' : '結束測試模式'}
            </button>
          </div>
        )}
      </div>

      {/* Action Result / Feedback Message */}
      {actionMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '1.5',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: actionMessage.type === 'success' ? '#a7f3d0' : '#fca5a5',
          }}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Status Details Grid (Visible only when enabled) */}
      {isEnabled && status && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>目前進度 (Completed)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                已完成第 {status.completedWeeksCount} 週
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                教材週: {status.currentMaterialWeek || '無'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>下一週任務 (Next Job)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: status.nextJob ? '#60a5fa' : '#94a3b8' }}>
                {status.nextJob ? `Week ${status.completedWeeksCount + 1} (${status.nextJob.status})` : '無待處理任務'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                嘗試次數： {status.nextJob ? `${status.nextJob.attemptCount} / ${status.nextJob.maxAttempts}` : '-'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>目標測試週次 (Target)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#a78bfa' }}>
                第 {status.targetWeek} 週
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                剩餘 {Math.max(0, status.targetWeek - status.completedWeeksCount)} 週
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>前週反饋 / 記憶寫入</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: status.latestMaterial?.hasFeedback ? '#34d399' : '#fbbf24' }}>
                反饋: {status.latestMaterial ? (status.latestMaterial.hasFeedback ? '✓ 已填寫' : '未填寫 (feedbackMissing)') : '-'}
              </div>
              <div style={{ fontSize: '11px', color: status.latestMaterial?.observationsRecordedAt ? '#34d399' : '#f87171', marginTop: '2px' }}>
                記憶: {status.latestMaterial ? (status.latestMaterial.observationsRecordedAt ? '✓ 觀察已寫入' : '⚠️ 尚未寫入') : '-'}
              </div>
            </div>
          </div>

          {/* Blocking reason notice */}
          {!canAdvance && advanceBlockingReason && (
            <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '4px', color: '#fef08a', fontSize: '12px' }}>
              ℹ️ <strong>推進受阻原因：</strong> {advanceBlockingReason}
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="refresh-btn"
              style={{
                background: canAdvance ? '#7c3aed' : '#334155',
                color: canAdvance ? '#fff' : '#64748b',
                borderColor: canAdvance ? '#8b5cf6' : '#475569',
                fontWeight: 700,
                padding: '8px 18px',
                fontSize: '13px',
                cursor: canAdvance && !actionLoading ? 'pointer' : 'not-allowed',
              }}
              onClick={handleAdvanceWeek}
              disabled={!canAdvance || actionLoading}
            >
              {actionLoading ? '推進中...' : '⚡ 推進 1 個測試週'}
            </button>

            {status.latestMaterial && (
              <>
                <button
                  type="button"
                  className="refresh-btn"
                  style={{ background: '#1e293b', color: '#f8fafc', borderColor: '#475569', fontSize: '12px', padding: '8px 14px' }}
                  onClick={() => setShowFeedbackModal(true)}
                  disabled={actionLoading}
                >
                  📝 填寫測試回饋
                </button>

                <button
                  type="button"
                  className="refresh-btn"
                  style={{ background: '#1e293b', color: '#60a5fa', borderColor: '#3b82f6', fontSize: '12px', padding: '8px 14px' }}
                  onClick={() => handlePreviewPdf('student')}
                  disabled={actionLoading}
                >
                  📄 預覽學生 PDF
                </button>

                <button
                  type="button"
                  className="refresh-btn"
                  style={{ background: '#1e293b', color: '#34d399', borderColor: '#10b981', fontSize: '12px', padding: '8px 14px' }}
                  onClick={() => handlePreviewPdf('parent')}
                  disabled={actionLoading}
                >
                  📄 預覽家長解答 PDF
                </button>
              </>
            )}

            <div style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderColor: '#ef4444', fontSize: '12px', padding: '8px 14px', fontWeight: 600 }}
                onClick={() => setShowResetModal(true)}
                disabled={!canReset || actionLoading}
              >
                🔄 Reset to Onboarding (重設起點)
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div className="cockpit-card" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              📝 填寫測試學習反饋 (Week {status?.completedWeeksCount})
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              此反饋將以 production 格式寫入，並於按下「Advance 1 Test Week」時成為下一週生成的參考依據。
            </p>

            <form onSubmit={handleSaveFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  難易度感受 (Difficulty)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { val: 1, label: '太簡單 (1)' },
                    { val: 2, label: '偏易 (2)' },
                    { val: 3, label: '適中 (3)' },
                    { val: 4, label: '偏難 (4)' },
                    { val: 5, label: '太難 (5)' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setFeedbackDifficulty(d.val)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: feedbackDifficulty === d.val ? '#7c3aed' : 'var(--bg-main)',
                        color: feedbackDifficulty === d.val ? '#fff' : '#94a3b8',
                        border: '1px solid var(--border-strong)',
                        cursor: 'pointer',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  完成度 (Completion Rate)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 25, 50, 75, 100].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFeedbackCompletion(c)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: feedbackCompletion === c ? '#2563eb' : 'var(--bg-main)',
                        color: feedbackCompletion === c ? '#fff' : '#94a3b8',
                        border: '1px solid var(--border-strong)',
                        cursor: 'pointer',
                      }}
                    >
                      {c}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  主要卡住領域 (Weak Area)
                </label>
                <select
                  value={feedbackWeakArea}
                  onChange={(e) => setFeedbackWeakArea(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                >
                  <option value="vocabulary">單字量不足 (Vocabulary)</option>
                  <option value="grammar">文法句型混淆 (Grammar)</option>
                  <option value="reading">長文閱讀理解 (Reading)</option>
                  <option value="writing">手寫作答困難 (Writing)</option>
                  <option value="mixed">綜合問題 (Mixed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  錯題具體描述 (Mistakes Text)
                </label>
                <input
                  type="text"
                  placeholder="例如: 第 4 題過去分詞 irregular verb 記錯..."
                  value={feedbackMistakes}
                  onChange={(e) => setFeedbackMistakes(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  孩子聲音／回饋
                </label>
                <input
                  type="text"
                  placeholder="例如: 這次文章很有趣，但題目有點繞..."
                  value={feedbackChildComments}
                  onChange={(e) => setFeedbackChildComments(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  家長觀察 / 回饋 (Parent Comments)
                </label>
                <input
                  type="text"
                  placeholder="例如: 發現第 5 題閱讀理解需要多引導..."
                  value={feedbackParentComments}
                  onChange={(e) => setFeedbackParentComments(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  學校進度更新 (School Progress)
                </label>
                <input
                  type="text"
                  placeholder="例如: 學校目前教到 Unit 3 比較級..."
                  value={feedbackSchoolProgress}
                  onChange={(e) => setFeedbackSchoolProgress(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  興趣更新 (Interest Update)
                </label>
                <input
                  type="text"
                  placeholder="例如: 最近很喜歡恐龍與天文學..."
                  value={feedbackInterestUpdate}
                  onChange={(e) => setFeedbackInterestUpdate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="refresh-btn"
                  style={{ background: 'transparent', color: '#94a3b8', borderColor: '#475569' }}
                  onClick={() => setShowFeedbackModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="refresh-btn"
                  style={{ background: '#7c3aed', color: '#fff', borderColor: '#8b5cf6', fontWeight: 700 }}
                  disabled={actionLoading}
                >
                  {actionLoading ? '儲存中...' : '儲存反饋'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div className="cockpit-card" style={{ maxWidth: '520px', width: '100%', background: '#0f172a', border: '1px solid #ef4444', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              ⚠️ 重設測試學員回開通起點 （重設至開通起點）？
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '14px' }}>
              此操作為 <strong>長週期測試環境專用</strong>：
            </p>
            <ul style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', paddingLeft: '20px', margin: '0 0 16px' }}>
              <li><strong>完整保留</strong>：家長帳號、孩子 Profile、基準等級、年級 (G7-9)、版本 (康軒/翰林/南一)、興趣偏好、訂閱資格。</li>
              <li><strong>清空重設</strong>：已生成之每週教材、反饋、單字記憶、文法進度、歷史摘要與 Quality Observations。</li>
              <li><strong>自動清理</strong>：透過 Supabase Storage API 清除已上傳之私有 PDF 檔案。</li>
              <li><strong>重新排程</strong>：立即建立一份全新的 第 1 週 待生成任務。</li>
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: 'transparent', color: '#94a3b8', borderColor: '#475569' }}
                onClick={() => setShowResetModal(false)}
                disabled={actionLoading}
              >
                取消
              </button>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#ef4444', fontWeight: 700 }}
                onClick={handleResetConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? '重設中...' : '確認重設'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

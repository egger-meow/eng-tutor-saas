import React, { useState } from 'react'
import type { OperationsOverview, PipelineJobRow } from '../../client/types.js'

interface Props { data: OperationsOverview | null; onDrillDownTimeline: (childId: string, week?: string) => void }

const RETRY_LABELS: Record<PipelineJobRow['retryState'], string> = {
  first_attempt: '首次嘗試',
  retry_waiting: '等待重試',
  retry_in_progress: '重試審核中',
  exhausted: '已達嘗試上限',
  delivered_first_try: '首次產出成功',
  delivered_after_retry: '重試後成功',
}

const STATUS_LABELS: Record<string, string> = {
  'READY TO CLAIM': '可開始生成',
  'WAITING FEEDBACK': '等待回饋中',
  'RETRY READY': '等待重試生成',
  'AUTHORING CLAIMED — AWAITING SUBMISSION': '已領取，等待提交',
  'AUTHORING CLAIMED ??AWAITING SUBMISSION': '已領取，等待提交',
  'AWAITING FINISHER': '等待品質審核',
  'FINISHER PROCESSING': '品質審核中',
  'TECHNICAL FAILURE — RETRYABLE': '技術失敗，可重試',
  'TECHNICAL FAILURE ??RETRYABLE': '技術失敗，可重試',
  'DELIVERED WITH QUALITY OVERRIDE': '品質例外交付',
  'AWAITING RELEASE': '等待釋出',
  'RELEASED': '已釋出',
  'COMPLETED': '已完成',
  'QUALITY REJECTED': '品質未通過',
}

const FEEDBACK_TAGS: Record<string, { label: string; className: string }> = {
  onboarding: { label: '🚀 首次開通（無前週回饋）', className: 'feedback-tag onboarding' },
  received: { label: '✅ 家長回饋已填寫', className: 'feedback-tag received' },
  waiting_feedback: { label: '⏳ 等待家長回饋中', className: 'feedback-tag waiting' },
  cutoff_passed: { label: '⚠️ 已過截止（將直接生成）', className: 'feedback-tag cutoff' },
}

const COMPONENT_LABELS: Record<string, string> = {
  engine: '引擎',
  schema: '標準資料結構',
  prompt: '提示詞',
  qualityProfile: '品質設定',
  pdfRenderer: 'PDF 轉譯器',
  worker: '工作程序',
}

function JobRow({ job, onOpen }: { job: PipelineJobRow; onOpen: () => void }) {
  const isPending = job.status === 'READY TO CLAIM' || job.status === 'WAITING FEEDBACK' || job.status === 'RETRY READY'
  const fbTag = job.feedbackStatus ? FEEDBACK_TAGS[job.feedbackStatus] : null

  return (
    <button className="pipeline-job" onClick={onOpen}>
      <div className="pipeline-job-head">
        <strong>{job.childPseudonym}</strong>
        <span>教材週次 {job.materialWeek}</span>
      </div>

      {isPending && fbTag && (
        <div className="pipeline-job-feedback">
          <span className={fbTag.className}>{fbTag.label}</span>
          {job.feedbackStatus === 'waiting_feedback' && job.feedbackCutoffAt && (
            <small className="cutoff-hint">截止: {new Date(job.feedbackCutoffAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</small>
          )}
        </div>
      )}

      <div className="pipeline-job-status">{STATUS_LABELS[job.status] ?? job.status}</div>

      <div className="pipeline-job-meta">
        <span>第 {job.attemptNumber} 次嘗試／最多 {job.maxAttempts} 次</span>
        <span>{RETRY_LABELS[job.retryState] ?? job.retryState}</span>
        <time>{job.relevantTimestamp ? new Date(job.relevantTimestamp).toLocaleString('zh-TW', { hour12: false }) : '尚無時間資料'}</time>
      </div>
    </button>
  )
}

function PipelineColumn({ title, hint, jobs, onOpen }: { title: string; hint: string; jobs: PipelineJobRow[]; onOpen: (job: PipelineJobRow) => void }) {
  return (
    <section className="cockpit-card pipeline-column">
      <div className="pipeline-title">
        <div>
          <span>{title}</span>
          <small>{hint}</small>
        </div>
        <b>{jobs.length}</b>
      </div>
      <div className="pipeline-list">
        {jobs.length ? jobs.map((job) => <JobRow key={job.jobId} job={job} onOpen={() => onOpen(job)} />) : <div className="pipeline-empty">目前沒有工作</div>}
      </div>
    </section>
  )
}

export const OperationsOverviewView: React.FC<Props> = ({ data, onDrillDownTimeline }) => {
  const [manifestOpen, setManifestOpen] = useState(true)
  const [waitingFeedbackOpen, setWaitingFeedbackOpen] = useState(false)
  const [pathFilter, setPathFilter] = useState<'all' | 'week1_fast' | 'normal_finisher'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  if (!data) return <div>載入營運資料中…</div>
  const open = (job: PipelineJobRow) => onDrillDownTimeline(job.childId, job.materialWeek)
  const state = data.engineInspector.alignmentStatus
  const alignmentLabel = state === 'version_drift' ? '版本不一致' : state === 'unobservable' ? '尚無可驗證版本資料' : '規格已全面生效'

  const allSubmissions = data.recentSubmissions || []
  const filteredSubmissions = allSubmissions.filter((sub) => {
    if (pathFilter !== 'all') {
      const p = sub.publicationPath || (sub.processorId?.includes('fast') ? 'week1_fast' : 'normal_finisher')
      if (p !== pathFilter) return false
    }
    if (statusFilter !== 'all') {
      if (sub.status !== statusFilter) return false
    }
    return true
  })

  return (
    <div className="operations-cockpit">
      <section className="capacity-strip" aria-label="服務容量與公測狀態">
        <div><span>服務中孩子</span><strong>{data.capacity.activeCount} / {data.capacity.maxCapacity}</strong></div>
        <div>
          <span>公測階段 (歷史 100 名)</span>
          <strong style={{ color: data.capacity.freePilotActive ? '#16a34a' : '#6b7280' }}>
            {data.capacity.freePilotActive ? `進行中 (${data.capacity.freePilotAdmissions ?? 0}/${data.capacity.freePilotLimit ?? 100})` : '已截止'}
          </strong>
        </div>
        <div>
          <span>學員結構</span>
          <strong>免費 {data.subscriptionBreakdown.freePilotActiveCount ?? 0} · 付費 {data.subscriptionBreakdown.paidActiveCount}</strong>
        </div>
        <div><span>等候名單</span><strong>{data.capacity.waitingCount || 0}</strong></div>
        <div><span>總需求</span><strong>{data.capacity.totalDemand}</strong></div>
      </section>

      <section className={'engine-inspector ' + (state === 'aligned' ? 'aligned' : state)}>
        <button onClick={() => setManifestOpen((value) => !value)}>
          <span>正式環境引擎規格 <code>v{data.engineInspector.expected.engine}</code></span>
          <strong>{alignmentLabel}</strong>
          <small>{manifestOpen ? '收合版本清單' : '展開版本清單'}</small>
        </button>
        {manifestOpen && (
          <div className="engine-manifest">
            {Object.entries(data.engineInspector.expected).map(([component, version]) => (
              <div key={component}>
                <span>{COMPONENT_LABELS[component] ?? component}</span>
                <code>{version}</code>
              </div>
            ))}
            {data.engineInspector.drift.map((item) => (
              <div className={item.status === 'version_drift' ? 'drift-row' : 'unobservable-row'} key={item.source + '-' + item.id + '-' + item.component}>
                <span>{item.source} · {item.id.slice(0, 8)} · {COMPONENT_LABELS[item.component] ?? item.component}</span>
                <code>{item.status === 'unobservable' ? '尚無實際版本（預期 ' + item.expected + '）' : '預期 ' + item.expected + '／實際 ' + item.actual}</code>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="pipeline-grid">
        <PipelineColumn title="等待生成" hint="隨時可開始之生成與重試工作" jobs={data.pipeline.readyToClaim} onOpen={open} />
        <PipelineColumn title="等待品質審核" hint="已有提交，等待 Finisher 結果" jobs={data.pipeline.awaitingFinisher} onOpen={open} />
        <PipelineColumn title="審核完成" hint="最新嘗試已產生終態結果" jobs={data.pipeline.finisherDone} onOpen={open} />
      </div>

      {Boolean(data.pipeline.waitingFeedback?.length) && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              ⏳ 目前有 <strong style={{ color: '#eab308' }}>{data.pipeline.waitingFeedback.length}</strong> 位學員正在等待家長回饋中（未達截止時間，暫不進入生成佇列）
            </span>
          </div>
          <button
            type="button"
            className="refresh-btn"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setWaitingFeedbackOpen(!waitingFeedbackOpen)}
          >
            {waitingFeedbackOpen ? '收合名單' : '查看名單'}
          </button>
        </div>
      )}
      {waitingFeedbackOpen && Boolean(data.pipeline.waitingFeedback?.length) && (
        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
          {data.pipeline.waitingFeedback?.map((job) => (
            <JobRow key={job.jobId} job={job} onOpen={() => open(job)} />
          ))}
        </div>
      )}

      {/* Universal Curriculum Submissions & Processor Queue Section */}
      <section className="cockpit-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>教材提交佇列與處理紀錄 (Curriculum Submissions & Processor Queue)</span>
              <span className="status-pill active" style={{ fontSize: '11px' }}>
                共 {allSubmissions.length} 筆
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              統一教材提交佇列（Universal Queue），監控 Week 1 Fast Lane 與 Normal Finisher 之處理進度、租約狀態與錯誤回報。
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Publication Path Filter */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                className={`refresh-btn ${pathFilter === 'all' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', background: pathFilter === 'all' ? '#2563eb' : 'transparent', color: pathFilter === 'all' ? '#fff' : 'var(--text-muted)' }}
                onClick={() => setPathFilter('all')}
              >
                全部管道
              </button>
              <button
                type="button"
                className={`refresh-btn ${pathFilter === 'week1_fast' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', background: pathFilter === 'week1_fast' ? '#4f46e5' : 'transparent', color: pathFilter === 'week1_fast' ? '#fff' : 'var(--text-muted)' }}
                onClick={() => setPathFilter('week1_fast')}
              >
                ⚡ Week 1 Fast
              </button>
              <button
                type="button"
                className={`refresh-btn ${pathFilter === 'normal_finisher' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', background: pathFilter === 'normal_finisher' ? '#0891b2' : 'transparent', color: pathFilter === 'normal_finisher' ? '#fff' : 'var(--text-muted)' }}
                onClick={() => setPathFilter('normal_finisher')}
              >
                Normal Finisher
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
            >
              <option value="all">所有狀態 (All Statuses)</option>
              <option value="processing">處理中 (Processing)</option>
              <option value="pending">等待處理 (Pending)</option>
              <option value="completed">處理完成 (Completed)</option>
              <option value="quality_rejected">品質退回 (Quality Rejected)</option>
              <option value="technical_failed">技術失敗 (Technical Failed)</option>
            </select>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="cockpit-table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>學員</th>
                <th>週次 / 次數</th>
                <th>發行管道</th>
                <th>處理器 (Processor)</th>
                <th>狀態</th>
                <th>提交 / 處理時間</th>
                <th>診斷 / 錯誤代碼</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const resolvedPath = sub.publicationPath || (sub.processorId?.includes('fast') ? 'week1_fast' : 'normal_finisher')
                  const isWeek1Fast = resolvedPath === 'week1_fast'
                  return (
                    <tr key={`${sub.jobId}-${sub.authoringAttempt}`} style={{ cursor: 'pointer' }} onClick={() => sub.childId && onDrillDownTimeline(sub.childId, sub.materialWeek)}>
                      <td style={{ fontWeight: 600 }}>{sub.childPseudonym}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace' }}>{sub.materialWeek}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>#{sub.authoringAttempt}</span>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            fontSize: '10px',
                            background: isWeek1Fast ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                            color: isWeek1Fast ? '#818cf8' : '#22d3ee',
                            border: `1px solid ${isWeek1Fast ? '#6366f1' : '#0891b2'}`,
                          }}
                        >
                          {isWeek1Fast ? '⚡ Week 1 Fast' : 'Normal Finisher'}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', color: sub.processorId ? '#e2e8f0' : 'var(--text-dim)' }}>
                          {sub.processorId || (sub.status === 'processing' ? '租約中' : '尚未領取')}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            sub.status === 'completed'
                              ? 'active'
                              : sub.status === 'processing'
                              ? 'warning'
                              : sub.status === 'quality_rejected'
                              ? 'danger'
                              : sub.status === 'technical_failed'
                              ? 'danger'
                              : 'pending'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                        <div>送出: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</div>
                        {sub.processedAt && (
                          <div>完成: {new Date(sub.processedAt).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        )}
                        {sub.status === 'processing' && sub.processorLeaseExpiresAt && (
                          <div style={{ color: 'var(--status-amber)' }}>
                            租約至: {new Date(sub.processorLeaseExpiresAt).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        {sub.errorCode ? (
                          <div title={sub.errorMessage || sub.errorCode}>
                            <code style={{ color: 'var(--status-rose)', fontSize: '11px' }}>{sub.errorCode}</code>
                            {sub.errorMessage && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sub.errorMessage}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="refresh-btn"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (sub.childId) onDrillDownTimeline(sub.childId, sub.materialWeek)
                          }}
                        >
                          時間軸 →
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    無符合條件的教材提交紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
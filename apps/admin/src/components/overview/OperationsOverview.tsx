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
  if (!data) return <div>載入營運資料中…</div>
  const open = (job: PipelineJobRow) => onDrillDownTimeline(job.childId, job.materialWeek)
  const state = data.engineInspector.alignmentStatus
  const alignmentLabel = state === 'version_drift' ? '版本不一致' : state === 'unobservable' ? '尚無可驗證版本資料' : '規格已全面生效'

  return (
    <div className="operations-cockpit">
      <section className="capacity-strip" aria-label="服務容量">
        <div><span>服務中孩子</span><strong>{data.capacity.activeCount} / {data.capacity.maxCapacity}</strong></div>
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
        <PipelineColumn title="等待生成" hint="新的生成工作與等待重試工作" jobs={data.pipeline.readyToClaim} onOpen={open} />
        <PipelineColumn title="等待品質審核" hint="已有提交，等待 Finisher 結果" jobs={data.pipeline.awaitingFinisher} onOpen={open} />
        <PipelineColumn title="審核完成" hint="最新嘗試已產生終態結果" jobs={data.pipeline.finisherDone} onOpen={open} />
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import type { OperationsOverview, PipelineJobRow } from '../../client/types.js'

interface Props { data: OperationsOverview | null; onDrillDownTimeline: (childId: string, week?: string) => void }

function JobRow({ job, onOpen }: { job: PipelineJobRow; onOpen: () => void }) {
  return <button className="pipeline-job" onClick={onOpen}>
    <div className="pipeline-job-head"><strong>{job.childPseudonym}</strong><span>{job.materialWeek}</span></div>
    <div className="pipeline-job-status">{job.status}</div>
    <div className="pipeline-job-meta"><span>Attempt {job.attemptNumber}/{job.maxAttempts}</span><span>{job.retryState.replaceAll('_', ' ')}</span><time>{job.relevantTimestamp ? new Date(job.relevantTimestamp).toLocaleString('zh-TW', { hour12: false }) : 'No timestamp'}</time></div>
  </button>
}

function PipelineColumn({ title, hint, jobs, onOpen }: { title: string; hint: string; jobs: PipelineJobRow[]; onOpen: (job: PipelineJobRow) => void }) {
  return <section className="cockpit-card pipeline-column">
    <div className="pipeline-title"><div><span>{title}</span><small>{hint}</small></div><b>{jobs.length}</b></div>
    <div className="pipeline-list">{jobs.length ? jobs.map((job) => <JobRow key={job.jobId} job={job} onOpen={() => onOpen(job)} />) : <div className="pipeline-empty">No jobs</div>}</div>
  </section>
}

export const OperationsOverviewView: React.FC<Props> = ({ data, onDrillDownTimeline }) => {
  const [manifestOpen, setManifestOpen] = useState(false)
  if (!data) return <div>Loading operations…</div>
  const open = (job: PipelineJobRow) => onDrillDownTimeline(job.childId, job.materialWeek)
  const alignmentLabel = data.engineInspector.alignmentStatus === 'version_drift'
    ? 'VERSION DRIFT'
    : data.engineInspector.alignmentStatus === 'unobservable'
    ? 'UNOBSERVABLE'
    : 'VERSIONS ALIGNED'
  return <div className="operations-cockpit">
    <section className="capacity-strip" aria-label="Service capacity">
      <div><span>Service children</span><strong>{data.capacity.activeCount} / {data.capacity.maxCapacity}</strong></div>
      <div><span>Waiting</span><strong>{data.capacity.waitingCount || 0}</strong></div>
      <div><span>Total demand</span><strong>{data.capacity.totalDemand}</strong></div>
    </section>
    <section className={`engine-inspector ${data.engineInspector.aligned ? 'aligned' : 'drift'}`}>
      <button onClick={() => setManifestOpen((value) => !value)}><span>Production engine v{data.engineInspector.expected.engine}</span><strong>{alignmentLabel}</strong><small>{manifestOpen ? 'Hide manifest' : 'Show manifest'}</small></button>
      {manifestOpen && <div className="engine-manifest">
        {Object.entries(data.engineInspector.expected).map(([component, version]) => <div key={component}><span>{component}</span><code>{version}</code></div>)}
        {data.engineInspector.drift.map((item) => <div className="drift-row" key={`${item.source}-${item.id}-${item.component}`}><span>{item.source} · {item.id.slice(0, 8)} · {item.component}</span><code>{item.status === 'unobservable' ? `UNOBSERVABLE (expected ${item.expected})` : `expected ${item.expected} / actual ${item.actual}`}</code></div>)}
      </div>}
    </section>
    <div className="pipeline-grid">
      <PipelineColumn title="READY TO CLAIM" hint="New authoring and retry work" jobs={data.pipeline.readyToClaim} onOpen={open} />
      <PipelineColumn title="AWAITING FINISHER" hint="Submission exists; terminal result pending" jobs={data.pipeline.awaitingFinisher} onOpen={open} />
      <PipelineColumn title="FINISHER DONE" hint="Latest attempt reached a terminal result" jobs={data.pipeline.finisherDone} onOpen={open} />
    </div>
  </div>
}

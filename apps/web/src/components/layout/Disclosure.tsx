import { useId, useState, type ReactNode } from 'react'

/** Keep contents mounted so closing a panel never discards an in-progress edit. */
export function Reveal({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return <div className="interaction-reveal" data-open={open} aria-hidden={!open} inert={!open}>
    <div className="interaction-reveal-clip"><div id={id}>{children}</div></div>
  </div>
}

export function Disclosure({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className={`learning-disclosure ${className}`} data-open={open}>
    <button type="button" className="learning-disclosure-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
      <span className="learning-disclosure-label"><span>{title}</span>{hint && <span className="learning-disclosure-hint">{hint}</span>}</span>
      <span className="learning-disclosure-state" aria-hidden="true">{open ? '收起' : '展開'}<svg viewBox="0 0 20 20" width="20" height="20"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    </button>
    <Reveal open={open} id={id}><div className="learning-disclosure-content">{children}</div></Reveal>
  </div>
}

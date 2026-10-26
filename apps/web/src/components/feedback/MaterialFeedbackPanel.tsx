import { useRef, useState } from 'react'
import type { Material } from '../../lib/materials'
import { Reveal } from '../layout/Disclosure'
import { MaterialFeedbackAction } from '../materials/MaterialFeedbackAction'
import { FeedbackForm } from './FeedbackForm'
import { FeedbackSummary } from './FeedbackSummary'

export function MaterialFeedbackPanel({ material, onSaved, open: controlledOpen, onOpenChange }: {
  material: Material; onSaved: () => void; open?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const [activated, setActivated] = useState(false)
  const [saved, setSaved] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const open = controlledOpen ?? localOpen
  function setOpen(next: boolean) {
    setActivated(true)
    if (next) setSaved(false)
    setLocalOpen(next)
    onOpenChange?.(next)
  }
  function close() {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }
  return <section className="material-feedback-panel" aria-label="家長觀察與回饋">
    <div className="feedback-entry-header">
      <div className="feedback-entry-copy"><h3>孩子這週學得如何？<span>選填</span></h3><FeedbackSummary feedback={material.feedback} /></div>
      <MaterialFeedbackAction material={material} open={open} buttonRef={trigger} onToggle={() => setOpen(!open)} />
    </div>
    <div className="feedback-save-status" role="status">{saved && !open ? '✓ 家長觀察已儲存，之後也能再修改。' : ''}</div>
    <Reveal open={open} id={`feedback-${material.id}`}>
      {(activated || open) && <FeedbackForm material={material} onClose={close} onSaved={() => { setSaved(true); close(); onSaved() }} />}
    </Reveal>
  </section>
}

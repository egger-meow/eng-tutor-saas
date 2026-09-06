import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { type ReactNode } from 'react'
import { easings, durations } from './motion-tokens'

export function DisclosureIcon({ open }: { open: boolean }) {
  return (
    <span className={`disclosure-icon-wrap ${open ? 'is-open' : ''}`} aria-hidden="true">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="disclosure-svg"
      >
        <circle cx="10" cy="10" r="8.5" className="disclosure-icon-circle" />
        <path d="M6 10H14" className="disclosure-bar disclosure-bar-h" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M10 6V14" className="disclosure-bar disclosure-bar-v" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </span>
  )
}

interface DisclosureItemProps {
  id: string
  title: ReactNode
  children: ReactNode
  open: boolean
  onToggle: () => void
  className?: string
  triggerClassName?: string
  panelClassName?: string
  panelId?: string
  titleTag?: 'span' | 'h3' | 'h4'
}

export function DisclosureItem({
  id,
  title,
  children,
  open,
  onToggle,
  className = '',
  triggerClassName = '',
  panelClassName = '',
  panelId,
  titleTag: TitleTag = 'span',
}: DisclosureItemProps) {
  const reduceMotion = useReducedMotion()
  const computedPanelId = panelId || `disclosure-panel-${id}`

  return (
    <article className={`disclosure-item ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        id={`disclosure-trigger-${id}`}
        className={`disclosure-trigger ${triggerClassName}`.trim()}
        aria-expanded={open}
        aria-controls={computedPanelId}
        onClick={onToggle}
      >
        <TitleTag className="disclosure-title">{title}</TitleTag>
        <DisclosureIcon open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={computedPanelId}
            role="region"
            aria-labelledby={`disclosure-trigger-${id}`}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -6 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0, height: 0 } : { height: 0, opacity: 0, y: -4 }}
            transition={{
              duration: reduceMotion ? 0.05 : durations.disclosure,
              ease: easings.disclosure,
            }}
            style={{ overflow: 'hidden' }}
            className={`disclosure-panel ${panelClassName}`.trim()}
          >
            <div className="disclosure-content">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

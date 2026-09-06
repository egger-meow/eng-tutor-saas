import { useState, useRef, useEffect, type ReactNode, type MouseEvent } from 'react'

interface AnimatedDetailsProps {
  summary: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

export function AnimatedDetails({
  summary,
  children,
  className = '',
  id,
}: AnimatedDetailsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleSummaryClick = (e: MouseEvent) => {
    e.preventDefault()

    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!isOpen) {
      // Opening
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (detailsRef.current) detailsRef.current.open = true
      setIsOpen(true)
    } else {
      // Closing
      setIsOpen(false)
      if (isReducedMotion) {
        if (detailsRef.current) detailsRef.current.open = false
      } else {
        // Fallback timer in case transitionend is delayed or missed, but never blocks user clicks
        closeTimerRef.current = setTimeout(() => {
          if (detailsRef.current && !isOpen) {
            detailsRef.current.open = false
          }
        }, 400)
      }
    }
  }

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') {
      if (!isOpen && detailsRef.current) {
        detailsRef.current.open = false
      }
    }
  }

  return (
    <details
      ref={detailsRef}
      id={id}
      className={`public-section landing-more-details ${isOpen ? 'is-expanded' : ''} ${className}`.trim()}
    >
      <summary onClick={handleSummaryClick} aria-expanded={isOpen}>
        <span className={`summary-morph-icon ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="summary-svg">
            <circle cx="10" cy="10" r="8.5" className="summary-circle summary-icon-circle" />
            <path d="M6 10H14" className="summary-bar-h" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M10 6V14" className="summary-bar-v" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        <span className="summary-title-text">{summary}</span>
      </summary>
      <div
        className={`animated-details-wrapper ${isOpen ? 'is-open' : ''}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="animated-details-inner">
          {children}
        </div>
      </div>
    </details>
  )
}

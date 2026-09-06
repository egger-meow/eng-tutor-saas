import { useState, useRef, type ReactNode, type MouseEvent } from 'react'

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
  const [isAnimating, setIsAnimating] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  const handleSummaryClick = (e: MouseEvent) => {
    e.preventDefault()
    if (isAnimating) return

    if (!isOpen) {
      if (detailsRef.current) detailsRef.current.open = true
      setIsAnimating(true)
      requestAnimationFrame(() => {
        setIsOpen(true)
        setTimeout(() => setIsAnimating(false), 320)
      })
    } else {
      setIsAnimating(true)
      setIsOpen(false)
      setTimeout(() => {
        if (detailsRef.current) detailsRef.current.open = false
        setIsAnimating(false)
      }, 300)
    }
  }

  return (
    <details
      ref={detailsRef}
      id={id}
      className={`public-section landing-more-details ${isOpen ? 'is-expanded' : ''} ${className}`.trim()}
    >
      <summary onClick={handleSummaryClick}>
        <span className={`summary-morph-icon ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="summary-svg">
            <circle cx="10" cy="10" r="8.5" className="summary-icon-circle" />
            <path d="M6 10H14" className="summary-bar-h" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M10 6V14" className="summary-bar-v" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        <span className="summary-title-text">{summary}</span>
      </summary>
      <div className={`animated-details-wrapper ${isOpen ? 'is-open' : ''}`}>
        <div className="animated-details-inner">
          {children}
        </div>
      </div>
    </details>
  )
}

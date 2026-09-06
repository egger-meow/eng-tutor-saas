import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { easings } from './motion-tokens'

export type RevealStyle = 'paper' | 'text' | 'fade' | 'rise' | 'pop' | 'left' | 'right'

interface FadeInUpProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  reveal?: RevealStyle
}

const revealFrom: Record<RevealStyle, { opacity: number; x?: number; y?: number; scale?: number; rotate?: number }> = {
  paper: { opacity: 0, y: 18, scale: 0.985, rotate: 0.4 },
  text: { opacity: 0, y: 12 },
  fade: { opacity: 0, y: 8 },
  rise: { opacity: 0, y: 20, scale: 0.988 },
  pop: { opacity: 0, y: 18, scale: 0.985, rotate: -0.5 },
  left: { opacity: 0, x: -24, scale: 0.988, rotate: -0.3 },
  right: { opacity: 0, x: 24, scale: 0.988, rotate: 0.3 },
}

export function FadeInUp({
  children,
  delay = 0,
  duration = 0.42,
  y,
  reveal = 'rise',
  className = '',
  onViewportEnter,
  ...props
}: FadeInUpProps) {
  const reduceMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const initial = y === undefined ? revealFrom[reveal] : { opacity: 0, y }

  return (
    <motion.div
      initial={reduceMotion ? false : initial}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -6% 0px' }}
      transition={{
        duration,
        ease: easings.paperSettle,
        delay,
      }}
      onViewportEnter={(entry) => {
        setRevealed(true)
        onViewportEnter?.(entry)
      }}
      data-revealed={reduceMotion || revealed ? 'true' : 'false'}
      data-reveal={reveal}
      className={`motion-cascade ${className}`.trim()}
      {...props}
    >
      {children}
    </motion.div>
  )
}

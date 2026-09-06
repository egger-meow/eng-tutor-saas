import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { easings } from './motion-tokens'
import type { RevealStyle } from './FadeInUp'

const revealFrom = (reveal: RevealStyle) => ({
  opacity: 0,
  y: reveal === 'rise' ? 18 : reveal === 'pop' ? 16 : reveal === 'text' ? 10 : reveal === 'paper' ? 16 : 6,
  x: reveal === 'left' ? -20 : reveal === 'right' ? 20 : 0,
  scale: reveal === 'pop' || reveal === 'paper' ? 0.985 : 0.99,
  rotate: reveal === 'left' ? -0.4 : reveal === 'right' ? 0.4 : reveal === 'paper' ? 0.35 : 0,
})

type TagName = 'div' | 'ol' | 'ul' | 'li' | 'article' | 'section'

const motionMap = {
  div: motion.div,
  ol: motion.ol,
  ul: motion.ul,
  li: motion.li,
  article: motion.article,
  section: motion.section,
} as const

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  staggerDelay?: number
  tag?: TagName
}

export function StaggerContainer({
  children,
  staggerDelay: _staggerDelay = 0.06,
  className = '',
  tag = 'div',
  ...props
}: StaggerContainerProps) {
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  tag?: TagName
  reveal?: RevealStyle
  delay?: number
  'data-revealed'?: string
}

export function StaggerItem({
  children,
  className = '',
  tag = 'div',
  reveal = 'pop',
  delay = 0,
  initial,
  'data-revealed': dataRevealedProp,
  onViewportEnter,
  ...props
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const Component = motionMap[tag] as typeof motion.div
  const defaultInitial = reduceMotion ? false : revealFrom(reveal)

  return (
    <Component
      initial={initial !== undefined ? initial : defaultInitial}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -5% 0px' }}
      transition={{
        duration: 0.38,
        ease: easings.paperSettle,
        delay,
      }}
      onViewportEnter={(entry) => {
        setRevealed(true)
        onViewportEnter?.(entry)
      }}
      className={`motion-cascade ${className}`.trim()}
      data-revealed={reduceMotion || revealed || dataRevealedProp === 'true' ? 'true' : 'false'}
      data-reveal={reveal}
      {...props}
    >
      {children}
    </Component>
  )
}

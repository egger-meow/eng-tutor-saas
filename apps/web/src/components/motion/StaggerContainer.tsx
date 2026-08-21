import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { useState, type ReactNode } from 'react'

type RevealStyle = 'rise' | 'pop' | 'left' | 'right'
const revealFrom = (reveal: RevealStyle) => ({
    opacity: 0,
    y: reveal === 'rise' ? 30 : reveal === 'pop' ? 38 : 8,
    x: reveal === 'left' ? -42 : reveal === 'right' ? 42 : 0,
    scale: reveal === 'pop' ? 0.88 : 0.96,
    rotate: reveal === 'left' ? -0.8 : reveal === 'right' ? 0.8 : reveal === 'pop' ? -0.6 : 0,
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
  staggerDelay: _staggerDelay = 0.08,
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
}

export function StaggerItem({ children, className = '', tag = 'div', reveal = 'pop', delay = 0, onViewportEnter, ...props }: StaggerItemProps) {
  const reduceMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component
      initial={reduceMotion ? false : revealFrom(reveal)}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.22, margin: '0px 0px -6% 0px' }}
      transition={{ type: 'spring', duration: 0.42, bounce: reveal === 'pop' ? 0.38 : 0.22, delay }}
      onViewportEnter={(entry) => {
        setRevealed(true)
        onViewportEnter?.(entry)
      }}
      className={`motion-cascade ${className}`.trim()}
      data-revealed={reduceMotion || revealed ? 'true' : 'false'}
      data-reveal={reveal}
      {...props}
    >
      {children}
    </Component>
  )
}

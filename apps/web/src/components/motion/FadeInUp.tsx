import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface FadeInUpProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  reveal?: 'rise' | 'pop' | 'left' | 'right'
}

const revealFrom = {
  rise: { opacity: 0, y: 34, scale: 0.97 },
  pop: { opacity: 0, y: 42, scale: 0.88, rotate: -1.25 },
  left: { opacity: 0, x: -48, scale: 0.96, rotate: -0.75 },
  right: { opacity: 0, x: 48, scale: 0.96, rotate: 0.75 },
} as const

export function FadeInUp({ children, delay = 0, duration = 0.38, y, reveal = 'rise', className = '', ...props }: FadeInUpProps) {
  const reduceMotion = useReducedMotion()
  const initial = y === undefined ? revealFrom[reveal] : { opacity: 0, y }

  return (
    <motion.div
      initial={reduceMotion ? false : initial}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -8% 0px' }}
      transition={{ type: 'spring', duration, bounce: reveal === 'pop' ? 0.34 : 0.2, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

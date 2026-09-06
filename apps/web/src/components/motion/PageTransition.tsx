import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { easings, durations } from './motion-tokens'

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="page-transition-content"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.pageTransition, ease: easings.gentleFade }}
    >
      {children}
    </motion.div>
  )
}

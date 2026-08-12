import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (stagger = 0.08) => ({
    opacity: 1,
    transition: {
      staggerChildren: stagger,
    },
  }),
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
}

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
  staggerDelay = 0.08,
  className = '',
  tag = 'div',
  ...props
}: StaggerContainerProps) {
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      custom={staggerDelay}
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
}

export function StaggerItem({ children, className = '', tag = 'div', ...props }: StaggerItemProps) {
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component variants={itemVariants} className={className} {...props}>
      {children}
    </Component>
  )
}

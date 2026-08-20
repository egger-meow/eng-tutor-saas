import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion'
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

type RevealStyle = 'rise' | 'pop' | 'left' | 'right'

const itemVariants: Variants = {
  hidden: (reveal: RevealStyle = 'pop') => ({
    opacity: 0,
    y: reveal === 'rise' ? 30 : reveal === 'pop' ? 38 : 8,
    x: reveal === 'left' ? -42 : reveal === 'right' ? 42 : 0,
    scale: reveal === 'pop' ? 0.88 : 0.96,
    rotate: reveal === 'left' ? -0.8 : reveal === 'right' ? 0.8 : reveal === 'pop' ? -0.6 : 0,
  }),
  visible: (reveal: RevealStyle = 'pop') => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', duration: 0.42, bounce: reveal === 'pop' ? 0.38 : 0.22 },
  }),
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
  const reduceMotion = useReducedMotion()
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component
      variants={containerVariants}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.12 }}
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
  reveal?: RevealStyle
}

export function StaggerItem({ children, className = '', tag = 'div', reveal = 'pop', ...props }: StaggerItemProps) {
  const Component = motionMap[tag] as typeof motion.div
  return (
    <Component variants={itemVariants} custom={reveal} className={className} {...props}>
      {children}
    </Component>
  )
}

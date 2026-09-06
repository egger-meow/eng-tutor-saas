/**
 * PaperBond Motion Tokens
 * 
 * Calm, tactile, paper-inspired animation tokens:
 * - Lifting, revealing, unfolding, settling into place.
 * - Restrained translations (4px to 24px)
 * - Organic paper scale (0.985 to 1.0)
 * - Gentle paper rotation angles (±0.4° to ±0.8°)
 * - Decisive, non-rubbery easing curves
 */

export const easings = {
  /** Paper settling into its resting place without bouncing */
  paperSettle: [0.16, 1, 0.3, 1] as const,
  /** Light paper lifting off surface */
  paperLift: [0.22, 1, 0.36, 1] as const,
  /** Silky disclosure / accordion fold and unfold */
  disclosure: [0.2, 0.9, 0.3, 1] as const,
  /** Snappy micro-interaction feedback (buttons, toggles) */
  micro: [0.25, 0.1, 0.25, 1] as const,
  /** Subtle ease-out for fades */
  gentleFade: [0.33, 1, 0.68, 1] as const,
}

export const durations = {
  instant: 0.08,
  micro: 0.15,
  hover: 0.2,
  disclosure: 0.28,
  cardExpansion: 0.32,
  sectionReveal: 0.46,
  pageTransition: 0.24,
  cinematicStep: 0.6,
}

export const paperPhysics = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 28,
  mass: 0.8,
}

export const disclosurePhysics = {
  duration: durations.disclosure,
  ease: easings.disclosure,
}

export const hoverPhysics = {
  duration: durations.hover,
  ease: easings.paperLift,
}

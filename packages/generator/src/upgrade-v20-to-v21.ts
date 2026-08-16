import type { CurriculumPackage, CurriculumPackageV20 } from './curriculum-package-schema.js'

/**
 * Deterministically upgrades a legacy Schema 2.0.0 curriculum package into canonical Schema 2.1.0.
 *
 * Invariant:
 * - paragraphs: string[] is mapped into blocks: Array<{ type: 'paragraph', text: string }>
 * - genre is set to 'article'
 * - metadata.schemaVersion is upgraded to '2.1.0'
 */
export function upgradeV20ToV21(v20: CurriculumPackageV20): CurriculumPackage {
  const { paragraphs, ...restReading } = v20.studentLesson.reading

  return {
    ...v20,
    metadata: {
      ...v20.metadata,
      schemaVersion: '2.1.0',
    },
    studentLesson: {
      ...v20.studentLesson,
      reading: {
        ...restReading,
        genre: 'article',
        blocks: paragraphs.map((text) => ({ type: 'paragraph' as const, text })),
      },
    },
  }
}

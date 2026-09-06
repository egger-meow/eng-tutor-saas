import { describe, expect, it } from 'vitest'
import {
  CurriculumPackageSchema,
  QuestionV25Schema,
  countActiveResponseSlots,
  computeQuestionDuration,
  validateCurriculumPackage,
} from './index.js'

describe('Curriculum Response Contracts (Schema 2.5.0)', () => {
  describe('QuestionV25Schema response layouts', () => {
    it('accepts organizer table with ResponseGridCell objects and responseUnitId', () => {
      const parsed = QuestionV25Schema.safeParse({
        id: 'q-table-1',
        targetIds: ['target-1'],
        itemType: 'short-response',
        prompt: 'Fill in the table with clues from the reading.',
        writingLines: 0,
        difficulty: 'on-level',
        responseLayout: {
          type: 'organizer',
          headers: ['Clue Source', 'Inferred Meaning'],
          rows: [
            {
              label: 'Paragraph 1',
              cells: [
                { text: 'The door was locked from inside' },
                { responseUnitId: 'q-table-1.slot1', placeholder: 'What does this show?' },
              ],
            },
          ],
        },
      })
      expect(parsed.success).toBe(true)
    })

    it('accepts sequence layout with horizontal/vertical layoutDirection and step items', () => {
      const parsed = QuestionV25Schema.safeParse({
        id: 'q-seq-1',
        targetIds: ['target-1'],
        itemType: 'short-response',
        prompt: 'Order the chronological events.',
        writingLines: 0,
        difficulty: 'on-level',
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'horizontal',
          items: [
            { stepNumber: 1, label: 'Initiation', content: 'Mina started the robot test' },
            { stepNumber: 2, label: 'Observation', responseUnitId: 'q-seq-1.slot1', placeholder: 'What error happened?' },
            { stepNumber: 3, label: 'Adjustment', content: 'She shaded the lens' },
          ],
        },
      })
      expect(parsed.success).toBe(true)
    })
  })

  describe('Workload fit calculation with active response slots', () => {
    it('counts only real student slots and excludes static prompt cells', () => {
      const tableQuestion = {
        itemType: 'short-response',
        responseLayout: {
          type: 'table',
          headers: ['Col 1', 'Col 2', 'Col 3'],
          rows: [
            {
              cells: [
                { text: 'Given prompt 1' },
                { responseUnitId: 'u1', placeholder: 'Answer 1' },
                { responseUnitId: 'u2', placeholder: 'Answer 2' },
              ],
            },
            {
              cells: [
                { text: 'Given prompt 2' },
                { responseUnitId: 'u3', placeholder: 'Answer 3' },
                { text: 'Static note' },
              ],
            },
          ],
        },
      }

      expect(countActiveResponseSlots(tableQuestion)).toBe(3)
      // 2 base + 3 * 0.75 = 4.25 minutes
      expect(computeQuestionDuration(tableQuestion)).toBe(4.25)
    })

    it('counts sequence items declaring responseUnitId', () => {
      const seqQuestion = {
        itemType: 'sequence',
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'vertical',
          items: [
            { stepNumber: 1, content: 'Given step' },
            { stepNumber: 2, responseUnitId: 's1', placeholder: 'Action step' },
            { stepNumber: 3, responseUnitId: 's2', placeholder: 'Result step' },
          ],
        },
      }

      expect(countActiveResponseSlots(seqQuestion)).toBe(2)
      // 2 base + 2 * 0.75 = 3.5 minutes
      expect(computeQuestionDuration(seqQuestion)).toBe(3.5)
    })
  })

  describe('responseUnitRelationshipIssues validation', () => {
    function makeBasePackage(): any {
      return {
        metadata: { schemaVersion: '2.5.0' },
        learningPlan: { targets: [{ id: 't1' }] },
        studentLesson: {
          practice: [
            {
              stage: 'guided',
              questions: [],
            },
          ],
          homework: {
            questions: [],
          },
        },
        answers: [],
      }
    }

    it('rejects accidental answer exposure when response slot contains student-facing text', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q1',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Clue', 'Answer'],
          rows: [
            {
              cells: [
                { text: 'Given Clue' },
                { responseUnitId: 'Q1.slot1', text: 'LEAKED ANSWER TEXT' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q1',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q1.slot1', answer: 'LEAKED ANSWER TEXT' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Accidental answer exposure: response slot "Q1.slot1" contains student-facing text'))).toBe(true)
    })

    it('rejects accidental answer exposure when sequence slot contains student-facing content', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q2',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'sequence',
          layoutDirection: 'horizontal',
          items: [
            { stepNumber: 1, content: 'First step' },
            { stepNumber: 2, responseUnitId: 'Q2.slot1', content: 'LEAKED SEQUENCE CONTENT' },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q2',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q2.slot1', answer: 'LEAKED SEQUENCE CONTENT' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Accidental answer exposure: sequence response slot "Q2.slot1" contains student-facing content'))).toBe(true)
    })

    it('rejects missing unitAnswers in answer key for declared response slots', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q3',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'Q3.slot1', placeholder: 'Fill 1' },
                { responseUnitId: 'Q3.slot2', placeholder: 'Fill 2' },
              ],
            },
          ],
        },
      })
      // Only provides Q3.slot1, missing Q3.slot2
      pkg.answers.push({
        questionId: 'Q3',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q3.slot1', answer: 'Answer 1' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Missing unitAnswer for response unit "Q3.slot2" in question "Q3"'))).toBe(true)
    })

    it('rejects orphan unitAnswers that do not match any declared slot in the question', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q4',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'Q4.slot1', placeholder: 'Fill 1' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q4',
        answer: 'Model Answer',
        unitAnswers: [
          { unitId: 'Q4.slot1', answer: 'Answer 1' },
          { unitId: 'Q4.orphan', answer: 'Ghost answer' },
        ],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Orphan unitAnswer "Q4.orphan" does not match any declared response unit in question "Q4"'))).toBe(true)
    })

    it('rejects duplicate responseUnitId in question', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q5',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { responseUnitId: 'dup.slot', placeholder: 'Slot 1' },
                { responseUnitId: 'dup.slot', placeholder: 'Slot 2' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q5',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'dup.slot', answer: 'Answer' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues.some((i) => i.message.includes('Duplicate responseUnitId "dup.slot" in question "Q5"'))).toBe(true)
    })

    it('passes when slots use placeholders and answer key provides matching unitAnswers', async () => {
      const { responseUnitRelationshipIssues } = await import('./validate-curriculum-package.js')
      const pkg = makeBasePackage()
      pkg.studentLesson.practice[0].questions.push({
        id: 'Q6',
        itemType: 'short-response',
        writingLines: 0,
        responseLayout: {
          type: 'organizer',
          headers: ['Col 1', 'Col 2'],
          rows: [
            {
              cells: [
                { text: 'Given premise' },
                { responseUnitId: 'Q6.slot1', placeholder: 'Deduce conclusion' },
              ],
            },
          ],
        },
      })
      pkg.answers.push({
        questionId: 'Q6',
        answer: 'Model Answer',
        unitAnswers: [{ unitId: 'Q6.slot1', answer: 'Deduce conclusion answer', explanationZh: '見第二段' }],
      })

      const issues = responseUnitRelationshipIssues(pkg)
      expect(issues).toEqual([])
    })
  })
})
